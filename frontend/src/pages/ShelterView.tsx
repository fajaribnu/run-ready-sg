import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, X } from "lucide-react";
import ShelterControls from "../components/ShelterControls";
import ShelterBottomSheet from "../components/ShelterBottomSheet";
import { findShelter, planRoute } from "../services/api";
import useLeafletMap from "../map/useLeafletMap";
import { useLocation } from "../components/LocationProvider";

export const ShelterView = () => {
  const [loading, setLoading] = useState(false);

  const [shelters, setShelters] = useState<any[]>([]);
  const [selectedShelter, setSelectedShelter] = useState<any | null>(null);

  const [routeGeoJson, setRouteGeoJson] = useState<any>(null);
  const [navigationMode, setNavigationMode] = useState(false);

  const [showRecenter, setShowRecenter] = useState(false);
  const [autoFollowUser, setAutoFollowUser] = useState(true);

  const [popup, setPopup] = useState({
    open: false,
    title: "",
    message: "",
  });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const { currentUserPos, locationReady, permissionState } = useLocation();

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
    showLinkways: true,
  });

  useEffect(() => {
    if (!currentUserPos) return;

    let cancelled = false;

    const loadShelters = async () => {
      try {
        setLoading(true);

        const data = await findShelter(currentUserPos.lat, currentUserPos.lng, 3);
        if (cancelled) return;

        const nextShelters = data?.shelters ?? [];
        setShelters(nextShelters);

        setSelectedShelter((prev) => {
          if (!prev) return nextShelters[0] ?? null;

          const matched = nextShelters.find((s: any) => s.name === prev.name);
          return matched ?? nextShelters[0] ?? null;
        });

        if (nextShelters.length > 0 && !navigationMode) {
          setAutoFollowUser(false);
        }
      } catch (err) {
        console.error("Failed to load shelters:", err);

        if (cancelled) return;

        setShelters([]);
        setSelectedShelter(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadShelters();

    return () => {
      cancelled = true;
    };
  }, [currentUserPos]);

  const openPopup = (title: string, message: string) => {
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

  const onNavigate = async () => {
    if (!selectedShelter) {
      openPopup("No shelter selected", "Please choose a shelter marker first.");
      return;
    }
    if (!currentUserPos) {
      openPopup("Location unavailable", "We need your location to navigate.");
      return;
    }

    setLoading(true);
    try {
      const result = await planRoute(
        currentUserPos.lat,
        currentUserPos.lng,
        1,
        false,
        selectedShelter.lat,
        selectedShelter.lng,
      );

      const firstFeature = (result as any)?.features?.[0];
      const coords = firstFeature?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) {
        openPopup("Route unavailable", "Could not generate a route to this shelter.");
        return;
      }

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
              stroke: "#ef4444",
              "stroke-width": 6,
              source: "shelter_route",
            },
            geometry: firstFeature.geometry,
          },
        ],
      };

      setRouteGeoJson(nextRouteGeoJson);
      setNavigationMode(true);
      setAutoFollowUser(true);
      setShowRecenter(false);
      markNavigationStarted();
      recenterOnUser();
    } catch (err) {
      console.error("Failed to get shelter route:", err);
      openPopup("Route unavailable", "We could not generate a route to this shelter.");
    } finally {
      setLoading(false);
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
            !locationReady
              ? "Getting your location..."
              : loading
              ? "Finding nearby shelters..."
              : selectedShelter?.name ?? "No shelter selected"
          }
          distanceM={selectedShelter?.distance_m ?? 0}
          durationMin={selectedShelter?.walk_time_min ?? 0}
          onNavigate={onNavigate}
          onExitNavigation={onExitNavigation}
          isShelterReady={
            locationReady &&
            permissionState !== "denied" &&
            shelters.length > 0 &&
            selectedShelter != null
          }
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

      {permissionState === "denied" && !popup.open && (
        <div className="absolute left-1/2 top-6 z-40 w-[calc(100%-3rem)] max-w-md -translate-x-1/2 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-lg">
          <p className="text-sm leading-relaxed text-outline">
            Location permission is denied. Nearby shelter search and live tracking
            are unavailable until location access is enabled in your browser
            settings.
          </p>
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