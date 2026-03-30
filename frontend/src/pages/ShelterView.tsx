import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, X } from "lucide-react";
import polyline from "@mapbox/polyline";
import ShelterControls from "../components/ShelterControls";
import ShelterBottomSheet from "../components/ShelterBottomSheet";
import { findShelter, getCurrentPosition } from "../services/api";
import useLeafletMap from "../map/useLeafletMap";

export const ShelterView = () => {
  const [loading, setLoading] = useState(false);
  const [currentUserPos, setCurrentUserPos] = useState(null);

  const [shelters, setShelters] = useState([]);
  const [selectedShelter, setSelectedShelter] = useState(null);

  const [routeGeoJson, setRouteGeoJson] = useState(null);
  const [navigationMode, setNavigationMode] = useState(false);

  const [showRecenter, setShowRecenter] = useState(false);
  const [autoFollowUser, setAutoFollowUser] = useState(true);

  const [popup, setPopup] = useState({
    open: false,
    title: "",
    message: "",
  });

  const mapContainerRef = useRef(null);

  const {
    recenterOnUser,
    showWholeRoute,
    markNavigationStarted,
  } = useLeafletMap({
    mapContainerRef,
    currentUserPos,
    routeGeoJson,
    navigationMode,
    autoFollowUser,
    setAutoFollowUser,
    setShowRecenter,
    shelters,
    selectedShelter,
    onSelectShelter: setSelectedShelter,
    fitSheltersOnLoad: !routeGeoJson,
  });

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);

        const pos = await getCurrentPosition();
        if (cancelled) return;

        const nextPos = {
          lat: pos.lat,
          lng: pos.lng,
          heading: 0,
        };

        setCurrentUserPos(nextPos);

        const data = await findShelter(nextPos.lat, nextPos.lng, 3);
        if (cancelled) return;

        const nextShelters = data?.shelters ?? [];
        setShelters(nextShelters);
        setSelectedShelter(nextShelters[0] ?? null);

        if (nextShelters.length > 0) {
          setAutoFollowUser(false);
        }
      } catch (err) {
        console.error("Failed to init shelter view:", err);

        const fallbackPos = {
          lat: 1.35,
          lng: 103.82,
          heading: 0,
        };

        setCurrentUserPos(fallbackPos);

        try {
          const data = await findShelter(fallbackPos.lat, fallbackPos.lng, 3);
          if (cancelled) return;

          const nextShelters = data?.shelters ?? [];
          setShelters(nextShelters);
          setSelectedShelter(nextShelters[0] ?? null);

          if (nextShelters.length > 0) {
            setAutoFollowUser(false);
          }
        } catch (shelterErr) {
          console.error("Failed to find shelters from fallback location:", shelterErr);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const openPopup = (title, message) => {
    setPopup({
      open: true,
      title,
      message,
    });
  };

  const closePopup = () => {
    setPopup((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const onNavigate = () => {
    if (!selectedShelter) {
      openPopup("No shelter selected", "Please choose a shelter marker first.");
      return;
    }

    const encodedPolyline = selectedShelter?.route_polyline;

    if (!encodedPolyline || typeof encodedPolyline !== "string" || !encodedPolyline.trim()) {
      openPopup(
        "Route not available yet",
        "This shelter does not have route data yet. Please choose another shelter or try again later."
      );
      return;
    }

    try {
      const decoded = polyline.decode(encodedPolyline);

      if (!Array.isArray(decoded) || decoded.length < 2) {
        openPopup(
          "Invalid route data",
          "The route returned for this shelter could not be drawn."
        );
        return;
      }

      const coordinates = decoded.map(([lat, lng]) => [lng, lat]);

      const nextRouteGeoJson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              shelter_name: selectedShelter.name,
              shelter_type: selectedShelter.type,
              distance_m: selectedShelter.distance_m,
              walk_time_min: selectedShelter.walk_time_min,
              source: "shelter_route",
            },
            geometry: {
              type: "LineString",
              coordinates,
            },
          },
        ],
      };

      setRouteGeoJson(nextRouteGeoJson);
      setNavigationMode(true);
      setAutoFollowUser(true);
      setShowRecenter(false);
      markNavigationStarted();
    } catch (err) {
      console.error("Failed to decode shelter route:", err);
      openPopup(
        "Route unavailable",
        "We could not render the route for this shelter."
      );
    }
  };

  const onExitNavigation = () => {
    showWholeRoute?.();
    setNavigationMode(false);
    setAutoFollowUser(false);
    setShowRecenter(false);
    setRouteGeoJson(null);

    if (shelters.length > 0) {
      setSelectedShelter((prev) => prev ?? shelters[0]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative h-[calc(100vh-160px)] overflow-hidden -mx-6"
    >
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      <ShelterControls
        onRecenter={recenterOnUser}
        showRecenter={showRecenter}
      />

      {!navigationMode && (
        <ShelterBottomSheet
          navigationMode={navigationMode}
          shelterName={
            selectedShelter?.name ??
            (loading ? "Finding nearby shelters..." : "No shelter selected")
          }
          distanceM={selectedShelter?.distance_m ?? 0}
          durationMin={selectedShelter?.walk_time_min ?? 0}
          onNavigate={onNavigate}
          onExitNavigation={onExitNavigation}
          isShelterReady={shelters.length > 0 && selectedShelter != null}
        />
      )}

      {navigationMode && (
        <div className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2">
          <button
            onClick={onExitNavigation}
            className="flex items-center justify-center gap-2 rounded-full bg-surface-container-lowest px-6 py-4 font-bold text-on-surface shadow-lg transition-all hover:bg-surface-container-high active:scale-95"
          >
            <X size={20} />
            Exit Navigation
          </button>
        </div>
      )}

      {popup.open && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-[0_20px_50px_rgba(0,94,83,0.12)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
                  <AlertCircle size={20} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-on-surface tracking-tight">
                    {popup.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-outline">
                    {popup.message}
                  </p>
                </div>
              </div>

              <button
                onClick={closePopup}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-outline transition-transform active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            <button
              onClick={closePopup}
              className="w-full rounded-full bg-primary py-3 font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};