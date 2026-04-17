import React, { useEffect, useRef } from "react";
import L, {
  LatLngExpression,
  Map as LeafletMap,
  LayerGroup,
  Marker,
  Polyline,
} from "leaflet";
import { findNearestRoutePoint } from "./geometry";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
} from "geojson";

import { renderToStaticMarkup } from "react-dom/server";
import { Umbrella } from "lucide-react";
import { getLinkways } from "../services/api";

/* =========================================================
 * MAP CONSTANTS
 * ======================================================= */

const ROUTE_OVERVIEW_PADDING: L.PointTuple = [20, 20];
const NAV_ZOOM = 19;

/* =========================================================
 * TYPES
 * ======================================================= */

type UserPosition = {
  lat: number;
  lng: number;
  heading?: number;
};

type Shelter = {
  name: string;
  type?: string;
  lat: number;
  lng: number;
  distance_m?: number;
  walk_time_min?: number;
  route_polyline?: string | null;
};

type RouteFeature = Feature<LineString | MultiLineString>;
type RouteGeoJson = FeatureCollection<LineString | MultiLineString>;

type UseLeafletMapParams = {
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  currentUserPos: UserPosition | null;
  routeGeoJson: RouteGeoJson | null;
  navigationMode: boolean;
  autoFollowUser: boolean;
  setAutoFollowUser: (value: boolean) => void;
  setShowRecenter: (value: boolean) => void;
  onRouteFinished?: () => void;

  shelters?: Shelter[];
  selectedShelter?: Shelter | null;
  onSelectShelter?: (shelter: Shelter) => void;
  fitSheltersOnLoad?: boolean;

  onMapClick?: (lat: number, lng: number) => void;
  destPos?: { lat: number; lng: number } | null;

  showLinkways?: boolean;
};

type AnimatePolylineOptions = {
  duration?: number;
  color?: string;
  underlayColor?: string;
  onDone?: (layers: {
    outlineUnderlay: Polyline;
    routeUnderlay: Polyline;
    animatedLine: Polyline;
    hitbox: Polyline;
    startMarker: L.CircleMarker;
    endMarker: L.CircleMarker;
  }) => void;
};

type AnimatePolylineResult = {
  layers: {
    outlineUnderlay: Polyline;
    routeUnderlay: Polyline;
    animatedLine: Polyline;
    hitbox: Polyline;
    startMarker: L.CircleMarker;
    endMarker: L.CircleMarker;
  };
  cancel: () => void;
} | null;

/* =========================================================
 * ROUTE GEOMETRY / MATH HELPERS
 * =======================================================
 * These helpers are shared by route rendering and
 * navigation-progress updates.
 * ======================================================= */
/* =========================================================
 * ROUTE GEOMETRY / MATH HELPERS
 * =======================================================
 * These helpers convert route data into map-friendly coordinates
 * and compute progress along a route.
 *
 * In this file:
 * - GeoJSON route coordinates are stored as [lng, lat]
 * - Leaflet / our route math usually works with [lat, lng]
 * So several helpers below are mainly about converting formats
 * and measuring distance along the route.
 * ======================================================= */

/**
 * Project a user point onto one route segment AB.
 *
 * Why:
 * If the user is near a route, they are usually not exactly on one of the
 * route's stored points. This function finds the closest point on the line
 * segment between A and B.
 *
 * Output:
 * - t: how far along segment AB the projected point is
 *      0   = exactly at A
 *      1   = exactly at B
 *      0.5 = halfway between A and B
 * - latlng: the snapped point on the segment
 *
 * Used for:
 * - finding where the user currently is along the route
 * - updating completed route progress smoothly
 */
function projectPointToSegment(point: L.LatLng, a: L.LatLng, b: L.LatLng) {
  const px = point.lng;
  const py = point.lat;
  const ax = a.lng;
  const ay = a.lat;
  const bx = b.lng;
  const by = b.lat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return {
      t: 0,
      latlng: [a.lat, a.lng] as [number, number],
    };
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    t,
    latlng: [ay + dy * t, ax + dx * t] as [number, number],
  };
}

/**
 * Build cumulative distance information for a route.
 *
 * Example:
 * If a route has points P0 -> P1 -> P2, this returns:
 * cumulative = [0, distance(P0,P1), distance(P0,P1)+distance(P1,P2)]
 *
 * Why:
 * This lets us convert "which segment am I on?" into
 * "how many meters along the full route am I?"
 *
 * Used for:
 * - route animation
 * - completed route progress
 * - finish detection
 */
function buildRouteMetrics(latlngs: [number, number][]) {
  const cumulative = [0];
  let total = 0;

  for (let i = 1; i < latlngs.length; i++) {
    const a = L.latLng(latlngs[i - 1][0], latlngs[i - 1][1]);
    const b = L.latLng(latlngs[i][0], latlngs[i][1]);
    total += a.distanceTo(b);
    cumulative.push(total);
  }

  return { cumulative, total };
}

/**
 * Find the user's nearest progress point on the route.
 *
 * What it does:
 * - checks every route segment
 * - projects the user onto each segment
 * - picks the closest projected point
 *
 * Returns:
 * - distanceToUser: how far the user is from the route
 * - distanceAlongRoute: how many meters from route start to that snapped point
 * - snappedLatLng: the nearest point on the route itself
 *
 * Why:
 * We need a stable "progress along route" value, not just nearest vertex.
 * This makes the blue completed-route overlay advance smoothly.
 */
function getNearestProgressOnRoute(
  latlngs: [number, number][],
  point: [number, number]
) {
  if (!latlngs || latlngs.length < 2) return null;

  const { cumulative } = buildRouteMetrics(latlngs);
  const userPoint = L.latLng(point[0], point[1]);

  let best: {
    distanceToUser: number;
    distanceAlongRoute: number;
    snappedLatLng: [number, number];
  } | null = null;

  for (let i = 1; i < latlngs.length; i++) {
    const a = L.latLng(latlngs[i - 1][0], latlngs[i - 1][1]);
    const b = L.latLng(latlngs[i][0], latlngs[i][1]);

    const projection = projectPointToSegment(userPoint, a, b);
    const snapped = L.latLng(projection.latlng[0], projection.latlng[1]);
    const distanceToUser = snapped.distanceTo(userPoint);
    const segmentLength = a.distanceTo(b);

    const distanceAlongRoute =
      cumulative[i - 1] + segmentLength * projection.t;

    if (!best || distanceToUser < best.distanceToUser) {
      best = {
        distanceToUser,
        distanceAlongRoute,
        snappedLatLng: [snapped.lat, snapped.lng],
      };
    }
  }

  return best;
}

/**
 * Keep only the completed part of the route up to a target distance.
 *
 * Example:
 * If the full route is 1000m and the user has completed 420m,
 * this returns route points only up to 420m.
 *
 * Why:
 * The completed-route polyline should stop where the user currently is,
 * not always draw the entire route.
 */
function splitRouteByDistance(
  latlngs: [number, number][],
  targetDistance: number
) {
  if (!latlngs.length) return { done: [], remaining: [] as [number, number][] };
  if (latlngs.length === 1) {
    return { done: [latlngs[0]], remaining: [latlngs[0]] };
  }

  const { cumulative, total } = buildRouteMetrics(latlngs);

  if (targetDistance <= 0) {
    return { done: [latlngs[0]] };
  }

  if (targetDistance >= total) {
    return { done: latlngs };
  }

  const done: [number, number][] = [latlngs[0]];

  for (let i = 1; i < latlngs.length; i++) {
    const segStartDist = cumulative[i - 1];
    const segEndDist = cumulative[i];

    if (targetDistance >= segEndDist) {
      done.push(latlngs[i]);
      continue;
    }

    const segLength = segEndDist - segStartDist;
    const remain = targetDistance - segStartDist;
    const ratio = segLength === 0 ? 0 : remain / segLength;

    const [lat1, lng1] = latlngs[i - 1];
    const [lat2, lng2] = latlngs[i];

    const splitPoint: [number, number] = [
      lat1 + (lat2 - lat1) * ratio,
      lng1 + (lng2 - lng1) * ratio,
    ];

    done.push(splitPoint);
    break;
  }

  return { done };
}

/**
 * Convert one GeoJSON route feature into Leaflet-friendly coordinates.
 *
 * IMPORTANT:
 * GeoJSON stores coordinates as [lng, lat]
 * but Leaflet usually expects [lat, lng]
 *
 * So this function flips every point from:
 *   [lng, lat] -> [lat, lng]
 *
 * It supports:
 * - LineString
 * - MultiLineString
 *
 * Why:
 * Almost all route drawing / route math below expects [lat, lng].
 * This function is the bridge between backend GeoJSON and frontend map logic.
 */
function getLatLngsFromFeature(
  feature: RouteFeature | null | undefined
): [number, number][] {
  if (!feature) return [];

  if (feature.geometry?.type === "LineString") {
    return feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  }

  if (feature.geometry?.type === "MultiLineString") {
    return feature.geometry.coordinates.flat().map(([lng, lat]) => [lat, lng]);
  }

  return [];
}

/**
 * Smooth easing function for animation.
 *
 * Why:
 * A route animation that moves at constant raw speed can feel robotic.
 * This makes the line draw:
 * - slower at the start
 * - faster in the middle
 * - slower near the end
 *
 * Used by:
 * - initial route drawing animation
 */
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Return only the visible portion of a route up to a target distance.
 *
 * Similar to splitRouteByDistance, but used mainly for animation frames.
 *
 * Example:
 * During animation, if we want to show only the first 35% of the route,
 * this returns just that visible partial line.
 *
 * Used for:
 * - animated route drawing on first load
 */
function getPartialLatLngsByDistance(
  latlngs: [number, number][],
  cumulative: number[],
  targetDistance: number
) {
  if (!latlngs.length) return [];
  if (latlngs.length === 1) return [latlngs[0]];
  if (targetDistance <= 0) return [latlngs[0]];

  const total = cumulative[cumulative.length - 1];
  if (targetDistance >= total) return latlngs;

  const partial: [number, number][] = [latlngs[0]];

  for (let i = 1; i < latlngs.length; i++) {
    const segStartDist = cumulative[i - 1];
    const segEndDist = cumulative[i];

    if (targetDistance >= segEndDist) {
      partial.push(latlngs[i]);
      continue;
    }

    const segLength = segEndDist - segStartDist;
    const remain = targetDistance - segStartDist;
    const ratio = segLength === 0 ? 0 : remain / segLength;

    const [lat1, lng1] = latlngs[i - 1];
    const [lat2, lng2] = latlngs[i];

    partial.push([
      lat1 + (lat2 - lat1) * ratio,
      lng1 + (lng2 - lng1) * ratio,
    ]);

    break;
  }

  return partial;
}

/* =========================================================
 * ICON HELPERS
 * ======================================================= */

function createArrowIcon(heading = 0) {
  const radius = 40;
  const spread = 50;

  const start = (-spread / 2) * (Math.PI / 180);
  const end = (spread / 2) * (Math.PI / 180);

  const x1 = radius * Math.cos(start);
  const y1 = radius * Math.sin(start);
  const x2 = radius * Math.cos(end);
  const y2 = radius * Math.sin(end);

  const path = `
    M 0 0
    L ${x1} ${y1}
    A ${radius} ${radius} 0 0 1 ${x2} ${y2}
    Z
  `;

  return L.divIcon({
    className: "custom-user-dot-icon",
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
      ">
        <svg
          width="${radius * 2}"
          height="${radius * 2}"
          viewBox="${-radius} ${-radius} ${radius * 2} ${radius * 2}"
          style="
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) rotate(${heading}deg);
            pointer-events: none;
          "
        >
          <path d="${path}" fill="rgba(59,130,246,0.25)" />
        </svg>

        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #2f80ff;
          border: 3px solid white;
          box-shadow: 0 1px 6px rgba(0,0,0,0.28);
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createShelterIcon(isSelected = false, label = "") {
  const iconSvg = renderToStaticMarkup(
    React.createElement(Umbrella, {
      size: 24,
      color: isSelected ? "white" : "#005e53",
      fill: "currentColor",
      strokeWidth: 2,
    })
  );

  return L.divIcon({
    className: "custom-shelter-marker",
    html: `
      <div class="flex flex-col items-center">
        <div
          class="
            w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95
            ${
              isSelected
                ? "scale-105"
                : "bg-surface-container-lowest border border-primary/20"
            }
          "
          style="${isSelected ? "" : "color:#005e53;"}"
        >
          ${iconSvg}
        </div>

        ${
          label
            ? `<div class="
                mt-2 px-3 py-1 rounded-full shadow-sm
                bg-surface-container-lowest text-primary
                text-[10px] font-bold whitespace-nowrap
              ">
                ${label}
              </div>`
            : ""
        }
      </div>
    `,
    iconSize: [56, 78],
    iconAnchor: [28, 28],
  });
}

/* =========================================================
 * ROUTE COLORING STATUS
 * =======================================================
 * Current implementation:
 * - The route is rendered as a single continuous line
 *   (no distinction between sheltered vs exposed segments yet)
 * - A separate overlay is used to indicate user progress along the route
 * - Colors are temporary placeholders and not aligned with the app theme
 *
 * Intended behavior:
 * - Sheltered route segments should be visually distinct (e.g. safer color)
 * - Exposed route segments should use a different contrasting color
 * - All colors should eventually follow design system / theme tokens
 *
 * Missing pieces:
 * 1. Data support:
 *    - Need segment-level information indicating sheltered vs exposed areas
 * 2. Rendering logic:
 *    - Split the route into multiple polylines based on segment type
 * 3. Styling:
 *    - Replace placeholder colors with final theme-approved colors for:
 *      • sheltered segments
 *      • exposed segments
 *      • completed (progress) route overlay
 *
 * Temporary colors (for development only):
 * - Red-ish: route animation and base underlay
 * - Blue: completed progress overlay
 * ======================================================= */

function animatePolylineDraw(
  group: LayerGroup,
  latlngs: [number, number][],
  {
    duration = 2200,
    color = "#ff6b6b",
    underlayColor = "#ff6b6b",
    onDone,
  }: AnimatePolylineOptions = {}
): AnimatePolylineResult {
  if (!group || latlngs.length < 2) return null;

  // Dark outline below the route to help it stand out on the basemap.
  const outlineUnderlay = L.polyline(latlngs, {
    color: "#000",
    weight: 10,
    opacity: 0.18,
    interactive: false,
  }).addTo(group);

  // Temporary route underlay. This is currently one uniform color.
  // Later this should be replaced by sheltered vs exposed segment colors.
  const routeUnderlay = L.polyline(latlngs, {
    color: underlayColor,
    weight: 8,
    opacity: 0.28,
    interactive: false,
  }).addTo(group);

  // Animated foreground line. Also currently one uniform color.
  // Later this should animate segment groups with theme-based colors.
  const animatedLine = L.polyline([latlngs[0]], {
    color,
    weight: 8,
    opacity: 1,
    className: "glow-line",
    interactive: false,
  }).addTo(group);

  // Wide invisible hitbox reserved for future interaction if needed.
  const hitbox = L.polyline(latlngs, {
    color,
    weight: 20,
    opacity: 0.01,
    interactive: false,
  }).addTo(group);

  const startMarker = L.circleMarker(latlngs[0], {
    radius: 8,
    color: "#ffffff",
    weight: 3,
    fillColor: "#16a34a",
    fillOpacity: 1,
    interactive: false,
  }).addTo(group);

  const endMarker = L.circleMarker(latlngs[latlngs.length - 1], {
    radius: 8,
    color: "#ffffff",
    weight: 3,
    fillColor: "#ef4444",
    fillOpacity: 1,
    interactive: false,
  }).addTo(group);

  const { cumulative, total } = buildRouteMetrics(latlngs);
  const startTime = performance.now();

  let rafId: number | null = null;
  let cancelled = false;

  function step(now: number) {
    if (cancelled) return;

    const rawT = Math.min((now - startTime) / duration, 1);
    const easedT = easeInOutCubic(rawT);
    const targetDistance = total * easedT;

    const partialLatLngs = getPartialLatLngsByDistance(
      latlngs,
      cumulative,
      targetDistance
    );
    animatedLine.setLatLngs(partialLatLngs as LatLngExpression[]);

    if (rawT < 1) {
      rafId = requestAnimationFrame(step);
    } else if (onDone) {
      onDone({
        outlineUnderlay,
        routeUnderlay,
        animatedLine,
        hitbox,
        startMarker,
        endMarker,
      });
    }
  }

  rafId = requestAnimationFrame(step);

  return {
    layers: {
      outlineUnderlay,
      routeUnderlay,
      animatedLine,
      hitbox,
      startMarker,
      endMarker,
    },
    cancel: () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);

      [
        outlineUnderlay,
        routeUnderlay,
        animatedLine,
        hitbox,
        startMarker,
        endMarker,
      ].forEach((layer) => {
        if (group.hasLayer(layer)) group.removeLayer(layer);
      });
    },
  };
}

/* =========================================================
 * MAIN HOOK
 * ======================================================= */

export default function useLeafletMap({
  mapContainerRef,
  currentUserPos,
  routeGeoJson,
  navigationMode,
  autoFollowUser,
  setAutoFollowUser,
  setShowRecenter,
  onRouteFinished,

  shelters = [],
  selectedShelter = null,
  onSelectShelter,
  fitSheltersOnLoad = false,

  onMapClick,
  destPos = null,

  showLinkways = false,
}: UseLeafletMapParams) {
  /* =====================================================
   * SHARED REFS
   * =================================================== */

  const mapRef = useRef<LeafletMap | null>(null);
  const navArrowRef = useRef<Marker | null>(null);
  const guideLineRef = useRef<Polyline | null>(null);

  const routeLayerGroupRef = useRef<LayerGroup | null>(null);
  const shelterLayerGroupRef = useRef<LayerGroup | null>(null);
  const destMarkerRef = useRef<L.CircleMarker | null>(null);
  const linkwayLayerRef = useRef<L.GeoJSON | null>(null);

  const programmaticMoveRef = useRef(false);
  const hasInitCenteredRef = useRef(false);
  const hasFittedSheltersRef = useRef(false);

  /* =====================================================
   * ROUTE-SPECIFIC REFS
   * =================================================== */

  const routeAnimationRef = useRef<AnimatePolylineResult>(null);
  const routeAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const completedRouteRef = useRef<Polyline | null>(null);
  const lastProgressDistanceRef = useRef(0);
  const routeLatLngsRef = useRef<[number, number][]>([]);
  const hasStartedNavRef = useRef(false);
  const hasFinishedRouteRef = useRef(false);

  /* =====================================================
   * MAP SETUP / TEARDOWN
   * =================================================== */

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const lat = currentUserPos?.lat ?? 1.3521;
    const lng = currentUserPos?.lng ?? 103.8198;

    const map = L.map(mapContainerRef.current).setView([lat, lng], 15);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
    }).addTo(map);

    const stopFollowing = () => {
      if (programmaticMoveRef.current) return;
      setAutoFollowUser(false);
      setShowRecenter(true);
    };

    map.on("dragstart", stopFollowing);
    map.on("zoomstart", stopFollowing);
    map.on("movestart", stopFollowing);

    map.on("moveend", () => {
      programmaticMoveRef.current = false;
    });

    map.on("zoomend", () => {
      programmaticMoveRef.current = false;
    });

    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    shelterLayerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      navArrowRef.current = null;
      guideLineRef.current = null;
      routeLayerGroupRef.current = null;
      shelterLayerGroupRef.current = null;

      if (routeAnimationRef.current) {
        routeAnimationRef.current.cancel?.();
        routeAnimationRef.current = null;
      }

      if (routeAnimationTimeoutRef.current) {
        clearTimeout(routeAnimationTimeoutRef.current);
        routeAnimationTimeoutRef.current = null;
      }

      hasStartedNavRef.current = false;
      completedRouteRef.current = null;
      routeLatLngsRef.current = [];
      lastProgressDistanceRef.current = 0;
      hasFittedSheltersRef.current = false;
    };
  }, [mapContainerRef, currentUserPos, setAutoFollowUser, setShowRecenter]);

  /* =====================================================
   * SHARED MAP STATE
   * =================================================== */

  useEffect(() => {
    hasFittedSheltersRef.current = false;
  }, [shelters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentUserPos || hasInitCenteredRef.current) return;

    programmaticMoveRef.current = true;
    map.setView([currentUserPos.lat, currentUserPos.lng], 15, { animate: false });
    hasInitCenteredRef.current = true;
  }, [currentUserPos]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentUserPos) return;

    if (!navArrowRef.current) {
      navArrowRef.current = L.marker([currentUserPos.lat, currentUserPos.lng], {
        icon: createArrowIcon(currentUserPos.heading ?? 0),
      }).addTo(map);
    } else {
      navArrowRef.current.setLatLng([currentUserPos.lat, currentUserPos.lng]);
      navArrowRef.current.setIcon(createArrowIcon(currentUserPos.heading ?? 0));
    }

    navArrowRef.current.setZIndexOffset(1000);

    if (navigationMode && autoFollowUser) {
      programmaticMoveRef.current = true;
      map.setView([currentUserPos.lat, currentUserPos.lng], NAV_ZOOM, {
        animate: false,
      });
      setShowRecenter(false);
    }
  }, [currentUserPos, navigationMode, autoFollowUser, setShowRecenter]);

  /* =====================================================
   * SHELTER MODE
   * =======================================================
   * Responsible for:
   * - rendering shelter markers
   * - selecting a shelter
   * - focusing clicked shelter
   * - initial fit-to-shelters behavior
   * =================================================== */

  useEffect(() => {
    const map = mapRef.current;
    const group = shelterLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (!Array.isArray(shelters) || shelters.length === 0) return;

    const bounds: [number, number][] = [];

    const sheltersToRender = navigationMode
      ? selectedShelter
        ? [selectedShelter]
        : []
      : shelters;

    sheltersToRender.forEach((shelter) => {
      if (shelter?.lat == null || shelter?.lng == null) return;

      const isSelected = selectedShelter?.name === shelter.name;
      const showLabel = true;
      const highlight = navigationMode ? true : isSelected;

      const marker = L.marker([shelter.lat, shelter.lng], {
        icon: createShelterIcon(highlight, showLabel ? shelter.name : ""),
        keyboard: false,
      });

      marker.on("click", () => {
        if (navigationMode) return;

        onSelectShelter?.(shelter);
        setAutoFollowUser(false);
        setShowRecenter(true);

        programmaticMoveRef.current = true;
        map.flyTo([shelter.lat, shelter.lng], 17, {
          animate: true,
          duration: 0.6,
        });
      });

      marker.addTo(group);
      bounds.push([shelter.lat, shelter.lng]);
    });

    if (
      !navigationMode &&
      fitSheltersOnLoad &&
      !hasFittedSheltersRef.current &&
      bounds.length > 0
    ) {
      const latLngBounds = L.latLngBounds(bounds);

      if (currentUserPos) {
        latLngBounds.extend([currentUserPos.lat, currentUserPos.lng]);
      }

      if (latLngBounds.isValid()) {
        hasFittedSheltersRef.current = true;
        programmaticMoveRef.current = true;
        map.flyToBounds(latLngBounds, {
          padding: ROUTE_OVERVIEW_PADDING,
          duration: 0.75,
        });
      }
    }
  }, [
    shelters,
    selectedShelter,
    navigationMode,
    onSelectShelter,
    currentUserPos,
    fitSheltersOnLoad,
    setAutoFollowUser,
    setShowRecenter,
  ]);

  /* =====================================================
   * DESTINATION MODE: MAP CLICK HANDLER
   * =================================================== */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!onMapClick) {
      map.getContainer().style.cursor = "";
      return;
    }

    map.getContainer().style.cursor = "crosshair";

    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };

    map.on("click", handler);
    return () => {
      map.off("click", handler);
      map.getContainer().style.cursor = "";
    };
  }, [onMapClick]);

  /* =====================================================
   * DESTINATION MODE: DESTINATION PIN MARKER
   * =================================================== */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    if (!destPos) return;

    destMarkerRef.current = L.circleMarker([destPos.lat, destPos.lng], {
      radius: 10,
      color: "#ffffff",
      weight: 3,
      fillColor: "#ef4444",
      fillOpacity: 1,
    }).addTo(map);
  }, [destPos]);

  /* =====================================================
   * LINKWAYS OVERLAY
   * Fetches covered linkway segments from the backend and
   * renders them as a teal dashed GeoJSON layer on the map.
   * Re-fetches whenever the user pans or zooms (moveend).
   * =================================================== */

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !showLinkways) {
      if (linkwayLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(linkwayLayerRef.current);
        linkwayLayerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    async function fetchAndRender() {
      const bounds = map!.getBounds();
      try {
        const data = await getLinkways(
          bounds.getSouth(),
          bounds.getWest(),
          bounds.getNorth(),
          bounds.getEast()
        );
        if (cancelled) return;

        if (linkwayLayerRef.current) {
          map!.removeLayer(linkwayLayerRef.current);
        }

        linkwayLayerRef.current = L.geoJSON(data, {
          style: {
            color: "#0ea5e9",
            weight: 3,
            opacity: 0.7,
            dashArray: "6 4",
          },
          interactive: false,
        }).addTo(map!);

        linkwayLayerRef.current.bringToBack();
      } catch {
        // Linkways are non-critical — fail silently
      }
    }

    fetchAndRender();
    map.on("moveend", fetchAndRender);

    return () => {
      cancelled = true;
      map.off("moveend", fetchAndRender);
      if (linkwayLayerRef.current) {
        map.removeLayer(linkwayLayerRef.current);
        linkwayLayerRef.current = null;
      }
    };
  }, [showLinkways]);

  /* =====================================================
   * ROUTE MODE: INITIAL DRAW + ANIMATION
   * =======================================================
   * Responsible for:
   * - clearing old route state
   * - drawing the currently selected route
   * - animating the route appearance
   * - setting up the completed-progress route overlay
   * =================================================== */

  useEffect(() => {
    const map = mapRef.current;
    const group = routeLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    hasStartedNavRef.current = false;
    hasFinishedRouteRef.current = false;
    completedRouteRef.current = null;
    routeLatLngsRef.current = [];
    lastProgressDistanceRef.current = 0;

    if (routeAnimationRef.current) {
      routeAnimationRef.current.cancel?.();
      routeAnimationRef.current = null;
    }

    if (routeAnimationTimeoutRef.current) {
      clearTimeout(routeAnimationTimeoutRef.current);
      routeAnimationTimeoutRef.current = null;
    }

    if (!routeGeoJson?.features?.length) return;

    const feature = routeGeoJson.features[0] as RouteFeature | undefined;
    if (!feature) return;

    const latlngs = getLatLngsFromFeature(feature);
    routeLatLngsRef.current = latlngs;
    lastProgressDistanceRef.current = 0;
    if (latlngs.length < 2) return;

    // Temporary placeholder color.
    // Later this should be replaced by a segmented sheltered/exposed palette.
    const color = "#ff6b6b";

    const startLatLng = latlngs[0];
    const bounds = L.latLngBounds(latlngs);

    const startAnimation = () => {
      group.clearLayers();

      routeAnimationRef.current = animatePolylineDraw(group, latlngs, {
        duration: 2400,
        color,
        underlayColor: color,
        onDone: ({ routeUnderlay }) => {
          routeAnimationRef.current = null;

          if (
            completedRouteRef.current &&
            group.hasLayer(completedRouteRef.current)
          ) {
            group.removeLayer(completedRouteRef.current);
          }

          // Temporary completed-progress color.
          // This is currently blue only for progress visibility.
          // Later this should also be aligned with theme tokens and
          // may need different logic if sheltered/exposed progress is split.
          completedRouteRef.current = L.polyline([latlngs[0]], {
            color: "#2563eb",
            weight: 8,
            opacity: 0.95,
            interactive: false,
          }).addTo(group);

          if (routeUnderlay) {
            routeUnderlay.bringToBack();
          }
          completedRouteRef.current.bringToFront();
        },
      });
    };

    if (bounds.isValid()) {
      programmaticMoveRef.current = true;
      map.flyToBounds(bounds, {
        padding: ROUTE_OVERVIEW_PADDING,
        duration: 0.85,
      });

      map.once("moveend", () => {
        programmaticMoveRef.current = true;
        map.flyTo(startLatLng, 17, {
          animate: true,
          duration: 0.8,
        });

        map.once("moveend", () => {
          startAnimation();
        });
      });
    } else {
      programmaticMoveRef.current = true;
      map.flyTo(startLatLng, 17, {
        animate: true,
        duration: 0.8,
      });

      map.once("moveend", () => {
        startAnimation();
      });
    }
  }, [routeGeoJson]);

  /* =====================================================
   * ROUTE MODE: USER-TO-ROUTE GUIDE LINE
   * =================================================== */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (guideLineRef.current) {
      map.removeLayer(guideLineRef.current);
      guideLineRef.current = null;
    }

    if (!navigationMode || !currentUserPos || !routeGeoJson) return;

    const feature = routeGeoJson.features[0] as RouteFeature | undefined;
    if (!feature) return;

    const nearestPoint = findNearestRoutePoint(
      [currentUserPos.lat, currentUserPos.lng],
      feature
    );

    if (nearestPoint) {
      guideLineRef.current = L.polyline(
        [[currentUserPos.lat, currentUserPos.lng], nearestPoint],
        { weight: 3, color: "#212529", opacity: 0.8 }
      ).addTo(map);
    }
  }, [navigationMode, currentUserPos, routeGeoJson]);

  /* =====================================================
   * ROUTE MODE: COMPLETED PROGRESS UPDATE
   * =================================================== */

  useEffect(() => {
    const group = routeLayerGroupRef.current;
    if (!group || !currentUserPos) return;
    if (!completedRouteRef.current) return;
    if (!hasStartedNavRef.current) return;

    const latlngs = routeLatLngsRef.current;
    if (!latlngs || latlngs.length < 2) return;

    const progress = getNearestProgressOnRoute(latlngs, [
      currentUserPos.lat,
      currentUserPos.lng,
    ]);
    if (!progress) return;

    const clampedProgress = Math.max(
      lastProgressDistanceRef.current,
      progress.distanceAlongRoute
    );

    lastProgressDistanceRef.current = clampedProgress;

    const { done } = splitRouteByDistance(latlngs, clampedProgress);
    completedRouteRef.current.setLatLngs(done as LatLngExpression[]);
  }, [currentUserPos]);

  /* =====================================================
   * ROUTE MODE: FINISH DETECTION
   * =================================================== */

  useEffect(() => {
    if (!navigationMode) return;
    if (!routeGeoJson?.features?.length) return;
    if (hasFinishedRouteRef.current) return;
    if (!currentUserPos) return;

    const feature = routeGeoJson.features[0] as RouteFeature | undefined;
    if (!feature) return;

    const coords = getLatLngsFromFeature(feature);
    if (!coords.length) return;

    const endPoint = coords[coords.length - 1];
    const user = L.latLng(currentUserPos.lat, currentUserPos.lng);
    const end = L.latLng(endPoint[0], endPoint[1]);

    const distanceToEnd = user.distanceTo(end);
    const totalRouteDistance = buildRouteMetrics(coords).total;

    if (
      distanceToEnd <= 1 &&
      lastProgressDistanceRef.current >= totalRouteDistance * 0.8
    ) {
      hasFinishedRouteRef.current = true;
      onRouteFinished?.();
    }
  }, [currentUserPos, navigationMode, routeGeoJson, onRouteFinished]);

  /* =====================================================
   * EXPOSED ACTIONS
   * =================================================== */

  function recenterOnUser() {
    const map = mapRef.current;
    if (!map || !currentUserPos) return;

    setAutoFollowUser(true);
    programmaticMoveRef.current = true;
    map.setView(
      [currentUserPos.lat, currentUserPos.lng],
      navigationMode ? NAV_ZOOM : map.getZoom(),
      { animate: true }
    );
    setShowRecenter(false);
  }

  function markNavigationStarted() {
    hasStartedNavRef.current = true;
  }

  function showWholeRoute() {
    const map = mapRef.current;
    if (!map || !routeGeoJson?.features?.length) return;
    if (!hasStartedNavRef.current) return;

    const feature = routeGeoJson.features[0] as RouteFeature | undefined;
    if (!feature) return;

    const latlngs = getLatLngsFromFeature(feature);
    if (latlngs.length < 2) return;

    const bounds = L.latLngBounds(latlngs);
    if (!bounds.isValid()) return;

    programmaticMoveRef.current = true;
    map.flyToBounds(bounds, {
      padding: ROUTE_OVERVIEW_PADDING,
      duration: 0.85,
    });
  }

  return { recenterOnUser, showWholeRoute, markNavigationStarted };
}