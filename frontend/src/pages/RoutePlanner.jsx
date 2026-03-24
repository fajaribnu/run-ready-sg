import { useEffect, useRef, useState } from "react";
import DistanceInput from "../components/DistanceInput";
import MapShell from "../components/MapShell";
import BottomSheet from "../components/BottomSheet";
import LoopCheckbox from "../components/LoopCheckbox";
import { getFeatureCoords } from "../map/geometry";
import { planRoute, getCurrentPosition } from "../services/api";
import {
  ensureCompassStarted,
  // startGeoTracking,
  // stopGeoTracking,
  startMockTracking,
  stopMockTracking
} from "../map/tracking";
import useLeafletMap from "../map/useLeafletMap";
import polyline from "@mapbox/polyline";
import confetti from "canvas-confetti";

export default function RoutePlanner() {
  const [distanceKm, setDistance] = useState("5");
  const [loop, setLoop] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("Slide up to generate route");
  const [hintType, setHintType] = useState("normal");
  const [prevHint, setPrevHint] = useState(hint);
  const [prevHintType, setPrevHintType] = useState(hintType);

  const [currentUserPos, setCurrentUserPos] = useState(null);
  const [compassHeading, setCompassHeading] = useState(null);

  const [routeGeoJson, setRouteGeoJson] = useState(null);
  const [navigationMode, setNavigationMode] = useState(false);
  const [autoFollowUser, setAutoFollowUser] = useState(true);
  const [showRecenter, setShowRecenter] = useState(false);

  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sheetVisibleHeight, setSheetVisibleHeight] = useState(140);
  const [showCongrats, setShowCongrats] = useState(false);

  const mapContainerRef = useRef(null);
  const compassStartedRef = useRef(false);
  const geoWatchIdRef = useRef(null);
  const latestStateRef = useRef({});

  const usedFallback = true;
  const FALLBACK_ROUTE_GEOJSON = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          distance_m: 500,
          source: "fallback",
        },
        geometry: {
          type: "LineString",
          "coordinates" : [
            [ 103.90705329447093, 1.4101726043243172 ],
            [ 103.90703727222663, 1.4101860337243919 ],
            [ 103.90699701214044, 1.4102181254314605 ],
            [ 103.90692096266507, 1.4102899641361322 ],
            [ 103.90688097357913, 1.4103389267287147 ],
            [ 103.90686009913618, 1.4103575220046738 ],
            [ 103.9067790699854, 1.4104099875942762 ],
            [ 103.90669371750616, 1.4104837257502374 ],
            [ 103.90666074235463, 1.4105195223969569 ],
            [ 103.9066146819741, 1.410554265874738 ],
            [ 103.90645864245857, 1.4106333600917023 ],
            [ 103.90636599772827, 1.4107002153584 ],
            [ 103.90624022646281, 1.4107609744493876 ],
            [ 103.90616642495124, 1.4107957187932627 ],
            [ 103.90608420357393, 1.4108555043135536 ],
            [ 103.90605225518355, 1.4108814144210062 ]
          ]
        }
      }
    ]
  };

  const showErrorHint = (msg) => {
    setPrevHint(hint);
    setPrevHintType(hintType);
    setHint(msg);
    setHintType("error");
  };

  const showSuccessHint = (msg) => {
    setPrevHint(hint);
    setPrevHintType(hintType);
    setHint(msg);
    setHintType("success");
  };

  const showNormalHint = (msg) => {
    setPrevHintType(hintType);
    setPrevHint(hint);
    setHint(msg);
    setHintType("normal");
  };

  const showPrevHint = () => {
    setHint(prevHint);
    setHintType(prevHintType);
  };

  const handleDistanceChange = (val) => {
    setDistance(val);

    const num = Number(val);

    if (!isNaN(num)) {
      const clamped = Math.max(0, Math.min(15, num));

      if (clamped > 0) {
        showPrevHint();
      }
    }
  };

  function isNullLike(value) {
    return value == null || value === "null" || value === "undefined" || value === "";
  }

  function getFirstLatLngFromGeoJson(data) {
    const feature = data?.features?.[0];
    const geom = feature?.geometry;

    if (!geom) return null;

    if (geom.type === "LineString" && geom.coordinates.length > 0) {
      const [lng, lat] = geom.coordinates[0];
      return { lat, lng };
    }

    if (
      geom.type === "MultiLineString" &&
      geom.coordinates.length > 0 &&
      geom.coordinates[0].length > 0
    ) {
      const [lng, lat] = geom.coordinates[0][0];
      return { lat, lng };
    }

    return null;
  }

  function contractRouteToGeoJson(data) {
    if (!data || typeof data !== "object") return null;

    // contract-level error response
    if (data.error) {
      throw new Error(data.details || data.error);
    }

    // contract says this can happen before implementation
    if (data.status === "not_implemented") {
      return null;
    }

    if (!Array.isArray(data.routes) || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const encoded = route?.polyline;

    if (isNullLike(encoded)) {
      return null;
    }

    let decoded;
    try {
      decoded = polyline.decode(encoded);
    } catch (err) {
      console.error("Failed to decode polyline:", err);
      return null;
    }

    if (!Array.isArray(decoded) || decoded.length === 0) {
      return null;
    }

    const coordinates = decoded.map(([lat, lng]) => [lng, lat]);

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: route.id,
            distance_km: route.distance_km,
            coverage_pct: route.coverage_pct,
            shelters_along_route: route.shelters_along_route,
            source: "api"
          },
          geometry: {
            type: "LineString",
            coordinates
          }
        }
      ]
    };
  }

  latestStateRef.current = {
    currentUserPos,
    compassHeading,
    navigationMode,
  };

  const { recenterOnUser, showWholeRoute, markNavigationStarted } = useLeafletMap({
    mapContainerRef,
    currentUserPos,
    routeGeoJson,
    navigationMode,
    autoFollowUser,
    setAutoFollowUser,
    setShowRecenter,

    onRouteFinished: () => {
      onExitNavigation();

      setShowCongrats(true); // 🎉 trigger popup
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (!currentUserPos) {
          const pos = await getCurrentPosition();
          if (cancelled) return;

          setCurrentUserPos({
            lat: pos.lat,
            lng: pos.lng,
            heading: 0,
          });
        }

        if (geoWatchIdRef.current == null) {
          // startGeoTracking({
          //   geoWatchIdRef,
          //   latestStateRef,
          //   setCurrentUserPos,
          // });
        }
      } catch (err) {
        console.error("Failed to init tracking:", err);
        setHint("Unable to get current location.");
        setHintType("error");
      }
    }

    init();
    return () => {
      cancelled = true;
      // stopGeoTracking(geoWatchIdRef);
      stopMockTracking()
    };
  }, []);

  useEffect(() => {
    if (!showCongrats) return;

    // 🎉 burst from center
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
    });

    // 🎉 side bursts (nicer effect)
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });

      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
    }, 200);

  }, [showCongrats]);

  async function onExplore() {
    if (!currentUserPos) {
      showNormalHint("Waiting for current location...");
      return;
    }

    const dist = Number(distanceKm);

    if (dist <= 0 || isNaN(dist)) {
      showErrorHint("Distance must be larger than 0.");
      return;
    }

    setLoading(true);
    showNormalHint("Loading route...");
    setNavigationMode(false);
    setAutoFollowUser(true);
    setShowRecenter(false);

    console.log("run");

    console.log("done");

    try {
      const raw = await planRoute(
        currentUserPos.lat,
        currentUserPos.lng,
        dist,
        loop
      );

      let nextRouteGeoJson = null;

      try {
        nextRouteGeoJson = contractRouteToGeoJson(raw);
      } catch (err) {
        console.error(err);
        throw err;
      }

      if (!nextRouteGeoJson) {
        if (usedFallback) {
          nextRouteGeoJson = FALLBACK_ROUTE_GEOJSON;
          setRouteGeoJson(nextRouteGeoJson);

          const fallbackStart = getFirstLatLngFromGeoJson(nextRouteGeoJson);

          if (fallbackStart) {
            setCurrentUserPos((prev) => ({
              lat: fallbackStart.lat,
              lng: fallbackStart.lng,
              heading: prev?.heading ?? 0,
            }));
          }

          if (raw?.status === "not_implemented") {
            showNormalHint("Route planner is not implemented yet. Loaded fallback route.");
          } else {
            showNormalHint("No usable route polyline returned. Loaded fallback route.");
          }
          setSheetExpanded(false);
        } else {
          throw new Error("No usable route polyline returned.");
        }
      } else {
        setRouteGeoJson(nextRouteGeoJson);
        showSuccessHint("Route found. Press Start to begin.");
        setSheetExpanded(false);
      }
    } catch (err) {
      console.error(err);
      showErrorHint(err.message || "Failed to load route.");
    } finally {
      setLoading(false);
    }
  }

  function onStartNavigation() {
    if (!routeGeoJson?.features?.length) return;

    const feature = routeGeoJson.features[0];
    const routeLatLngs = getFeatureCoords(feature);

    if (routeLatLngs.length) {
      stopMockTracking();
      console.log(routeLatLngs);
      startMockTracking({
        routeLatLngs,
        setCurrentUserPos,
      });
    }

    ensureCompassStarted({ compassStartedRef, setCompassHeading }).catch((err) => {
      console.error("Compass optional:", err);
    });

    markNavigationStarted();
    setNavigationMode(true);
    setAutoFollowUser(true);
    setShowRecenter(false);
    recenterOnUser();

    showNormalHint("Following route");
  }

  function onExitNavigation() {
    stopMockTracking();
    setNavigationMode(false);
    setAutoFollowUser(false);
    setShowRecenter(true);
    showWholeRoute();

    showNormalHint("Navigation ended.");
  }

  return (
    <div className="app-shell">
      <div className="map-layer">
        <MapShell
          mapContainerRef={mapContainerRef}
          showRecenter={showRecenter}
          onRecenter={recenterOnUser}
          navigationMode={navigationMode}
          hasRoute={!!routeGeoJson}
          onStartNavigation={onStartNavigation}
          onExitNavigation={onExitNavigation}
          hint={hint}
          loading={loading}
          hintType={hintType}
        />
      </div>
      <BottomSheet
        expanded={sheetExpanded}
        setExpanded={setSheetExpanded}
        collapsedVisible={140}
        expandedRatio={0.78}
        snapOpenThreshold={0.6}
        title="Route Planner"
        subtitle="Plan routes with maximum shelter coverage."
        onTranslateChange={(_, meta) => {
          const h = meta.visibleHeight;
          setSheetVisibleHeight(h);

          document.documentElement.style.setProperty(
            "--bottom-sheet-visible-height",
            `${h}px`
          );
  }}
      >
        <DistanceInput distanceKm={distanceKm} onDistanceChange={handleDistanceChange} />
        <LoopCheckbox loop={loop} setLoop={setLoop} />
        <button onClick={onExplore} className="btn-primary">
          Generate route (Coming Sprint 2)
        </button>
              </BottomSheet>
        {showCongrats && (
          <div className="congrats-popup">
            <div className="congrats-card">
              🎉 Congrats! You reached the end of the route.

              <button onClick={() => setShowCongrats(false)}>
                Thanks
              </button>
            </div>
          </div>
        )}
    </div>
  );
}