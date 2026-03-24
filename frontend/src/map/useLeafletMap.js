import { useEffect, useRef } from "react";
import L from "leaflet";
import { findNearestRoutePoint } from "./geometry";

const ROUTE_OVERVIEW_PADDING = [20, 20];
const NAV_ZOOM = 19;

function hasReachedRouteEnd(userPos, endLatLng, thresholdMeters = 20) {
  if (!userPos || !endLatLng) return false;

  const user = L.latLng(userPos.lat, userPos.lng);
  const end = L.latLng(endLatLng[0], endLatLng[1]);

  return user.distanceTo(end) <= thresholdMeters;
}

function projectPointToSegment(point, a, b) {
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
      latlng: [a.lat, a.lng],
    };
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    t,
    latlng: [ay + dy * t, ax + dx * t],
  };
}

function getNearestProgressOnRoute(latlngs, point) {
  if (!latlngs || latlngs.length < 2) return null;

  const { cumulative } = buildRouteMetrics(latlngs);
  const userPoint = L.latLng(point[0], point[1]);

  let best = null;

  for (let i = 1; i < latlngs.length; i++) {
    const a = L.latLng(latlngs[i - 1]);
    const b = L.latLng(latlngs[i]);

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

function splitRouteByDistance(latlngs, targetDistance) {
  if (!latlngs.length) return { done: [], remaining: [] };
  if (latlngs.length === 1) {
    return { done: [latlngs[0]], remaining: [latlngs[0]] };
  }

  const { cumulative, total } = buildRouteMetrics(latlngs);

  if (targetDistance <= 0) {
    return {
      done: [latlngs[0]],
    };
  }

  if (targetDistance >= total) {
    return {
      done: latlngs,
    };
  }

  const done = [latlngs[0]];

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

    const splitPoint = [
      lat1 + (lat2 - lat1) * ratio,
      lng1 + (lng2 - lng1) * ratio,
    ];

    done.push(splitPoint);
    break;
  }

  return { done };
}

function createArrowIcon(heading = 0) {
  const radius = 40;        // how far the cone extends
  const spread = 50;        // angle in degrees (wider = more convex)

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
          <path
            d="${path}"
            fill="rgba(59,130,246,0.25)"   <!-- stronger opacity -->
          />
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

function getLatLngsFromFeature(feature) {
  if (!feature) return [];

  if (feature.geometry?.type === "LineString") {
    return feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  }

  if (feature.geometry?.type === "MultiLineString") {
    return feature.geometry.coordinates.flat().map(([lng, lat]) => [lat, lng]);
  }

  return [];
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function buildRouteMetrics(latlngs) {
  const cumulative = [0];
  let total = 0;

  for (let i = 1; i < latlngs.length; i++) {
    const a = L.latLng(latlngs[i - 1]);
    const b = L.latLng(latlngs[i]);
    total += a.distanceTo(b);
    cumulative.push(total);
  }

  return { cumulative, total };
}

function getPartialLatLngsByDistance(latlngs, cumulative, targetDistance) {
  if (!latlngs.length) return [];
  if (latlngs.length === 1) return [latlngs[0]];
  if (targetDistance <= 0) return [latlngs[0]];

  const total = cumulative[cumulative.length - 1];
  if (targetDistance >= total) return latlngs;

  const partial = [latlngs[0]];

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

function animatePolylineDraw(
  group,
  latlngs,
  {
    duration = 2200,
    color = "#ff6b6b",
    underlayColor = "#ff6b6b",
    onDone,
  } = {}
) {
  if (!group || latlngs.length < 2) return null;

  const outlineUnderlay = L.polyline(latlngs, {
    color: "#000",
    weight: 10,
    opacity: 0.18,
    interactive: false,
  }).addTo(group);

  const routeUnderlay = L.polyline(latlngs, {
    color: underlayColor,
    weight: 8,
    opacity: 0.28,
    interactive: false,
  }).addTo(group);

  const animatedLine = L.polyline([latlngs[0]], {
    color,
    weight: 8,
    opacity: 1,
    className: "glow-line",
    interactive: false,
  }).addTo(group);

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

  let rafId = null;
  let cancelled = false;

  function step(now) {
    if (cancelled) return;

    const rawT = Math.min((now - startTime) / duration, 1);
    const easedT = easeInOutCubic(rawT);
    const targetDistance = total * easedT;

    const partialLatLngs = getPartialLatLngsByDistance(
      latlngs,
      cumulative,
      targetDistance
    );

    animatedLine.setLatLngs(partialLatLngs);

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

      [outlineUnderlay, routeUnderlay, animatedLine, hitbox, startMarker, endMarker].forEach((layer) => {
        if (group.hasLayer(layer)) group.removeLayer(layer);
      });
    },
  };
}

export default function useLeafletMap({
  mapContainerRef,
  currentUserPos,
  routeGeoJson,
  navigationMode,
  autoFollowUser,
  setAutoFollowUser,
  setShowRecenter,
  onRouteFinished
}) {
  const mapRef = useRef(null);
  const navArrowRef = useRef(null);
  const guideLineRef = useRef(null);
  const routeLayerGroupRef = useRef(null);
  const programmaticMoveRef = useRef(false);
  const hasInitCenteredRef = useRef(false);
  const routeAnimationRef = useRef(null);
  const routeAnimationTimeoutRef = useRef(null);
  const completedRouteRef = useRef(null);
  const lastProgressDistanceRef = useRef(0);
  const routeLatLngsRef = useRef([]);
  const hasStartedNavRef = useRef(false);
  const hasFinishedRouteRef = useRef(false);

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
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      navArrowRef.current = null;
      guideLineRef.current = null;
      routeLayerGroupRef.current = null;

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
    };
  }, [setAutoFollowUser, setShowRecenter]);

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
      navArrowRef.current = L.marker(
        [currentUserPos.lat, currentUserPos.lng],
        { icon: createArrowIcon(currentUserPos.heading ?? 0) }
      ).addTo(map);
    } else {
      navArrowRef.current.setLatLng([currentUserPos.lat, currentUserPos.lng]);
      navArrowRef.current.setIcon(createArrowIcon(currentUserPos.heading ?? 0));
    }

    navArrowRef.current.setZIndexOffset(1000);

    if (navigationMode && autoFollowUser) {
      programmaticMoveRef.current = true;
      map.setView(
        [currentUserPos.lat, currentUserPos.lng],
        NAV_ZOOM,
        { animate: false }
      );
      setShowRecenter(false);
    }
  }, [currentUserPos, navigationMode, autoFollowUser, setShowRecenter]);

  useEffect(() => {
    const map = mapRef.current;
    const group = routeLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    hasStartedNavRef.current = false;
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

    const feature = routeGeoJson.features[0];
    if (!feature) return;

    const latlngs = getLatLngsFromFeature(feature);
    routeLatLngsRef.current = latlngs;
    lastProgressDistanceRef.current = 0;
    if (latlngs.length < 2) return;

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

          if (completedRouteRef.current && group.hasLayer(completedRouteRef.current)) {
            group.removeLayer(completedRouteRef.current);
          }

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (guideLineRef.current) {
      map.removeLayer(guideLineRef.current);
      guideLineRef.current = null;
    }

    if (!navigationMode || !currentUserPos || !routeGeoJson) return;

    const feature = routeGeoJson.features[0];
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

    completedRouteRef.current.setLatLngs(done);
  }, [currentUserPos]);

  useEffect(() => {
    if (!navigationMode) return;
    if (!routeGeoJson?.features?.length) return;
    if (hasFinishedRouteRef.current) return;
    if (!currentUserPos) return;

    const feature = routeGeoJson.features[0];
    const coords = getLatLngsFromFeature(feature);
    if (!coords.length) return;

    const endPoint = coords[coords.length - 1];
    const user = L.latLng(currentUserPos.lat, currentUserPos.lng);
    const end = L.latLng(endPoint[0], endPoint[1]);

    const distanceToEnd = user.distanceTo(end);

    const totalRouteDistance = buildRouteMetrics(coords).total;

    if (distanceToEnd <= 1 && lastProgressDistanceRef.current >= totalRouteDistance * 0.8) {
      hasFinishedRouteRef.current = true;

      onRouteFinished?.();
    }
  }, [
    currentUserPos,
    navigationMode,
    routeGeoJson,
    setAutoFollowUser,
    setShowRecenter,
    showWholeRoute,
  ]);

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

    const feature = routeGeoJson.features[0];
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