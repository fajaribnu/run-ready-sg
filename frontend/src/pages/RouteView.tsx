import { useRef, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, X } from "lucide-react";
import polyline from "@mapbox/polyline";
import { RouteMapPanel } from "../components/RouteMapPanel";
import { RoutePlanningPanel } from "../components/RoutePlanningPanel";
import useLeafletMap from "../map/useLeafletMap";
import { planRoute } from "../services/api";
import { useLocation } from "../components/LocationProvider";

type RouteStats = {
  distance: number;
  duration: number;
  shelter: number;
  sheltersAlongRoute: number;
};

export const RouteView = () => {
  const [distance, setDistance] = useState(5);
  const [isLoop, setIsLoop] = useState(true);

  const [loading, setLoading] = useState(false);
  const [navigationMode, setNavigationMode] = useState(false);

  const [routeGeoJson, setRouteGeoJson] = useState<any>(null);
  const [hasGeneratedRoute, setHasGeneratedRoute] = useState(false);

  const [showRecenter, setShowRecenter] = useState(false);
  const [autoFollowUser, setAutoFollowUser] = useState(true);

  const [stats, setStats] = useState<RouteStats>({
    distance: 0,
    duration: 0,
    shelter: 0,
    sheltersAlongRoute: 0,
  });

  const [popup, setPopup] = useState({
    open: false,
    title: "",
    message: "",
  });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const { currentUserPos, locationReady, permissionState } = useLocation();

  const { recenterOnUser, showWholeRoute, markNavigationStarted } = useLeafletMap({
    mapContainerRef,
    currentUserPos,
    routeGeoJson,
    navigationMode,
    autoFollowUser,
    setAutoFollowUser,
    setShowRecenter,
  });

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

  const onGenerateRoute = async () => {
    if (!currentUserPos) return;

    setLoading(true);
    setNavigationMode(false);
    setAutoFollowUser(false);
    setShowRecenter(false);

    try {
      const res = await planRoute(
        currentUserPos.lat,
        currentUserPos.lng,
        distance,
        isLoop
      );

      const route = res?.routes?.[0];
      if (!route) {
        openPopup("No route found", "We could not generate a route right now.");
        return;
      }

      setHasGeneratedRoute(true);

      setStats({
        distance: route.distance_km ?? distance,
        duration: Math.round((route.distance_km ?? distance) * 6),
        shelter: Math.round(route.coverage_pct ?? 0),
        sheltersAlongRoute: route.shelters_along_route ?? 0,
      });

      const encoded = route.polyline;

      if (!encoded || typeof encoded !== "string" || !encoded.trim()) {
        openPopup("No route found", "There's no route can be generated at this moment.");
        setRouteGeoJson(null);
        return;
      }

      const decoded = polyline.decode(encoded);
      if (!Array.isArray(decoded) || decoded.length < 2) {
        openPopup("No route found", "The route generated is invalid.");
        setRouteGeoJson(null);
        return;
      }

      const coordinates = decoded.map(([lat, lng]) => [lng, lat]);

      const nextRouteGeoJson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              id: route.id,
              distance_km: route.distance_km,
              shelter_pct: route.coverage_pct,
              shelters_along_route: route.shelters_along_route,
              source: "route_view",
            },
            geometry: {
              type: "LineString",
              coordinates,
            },
          },
        ],
      };

      setRouteGeoJson(nextRouteGeoJson);
    } catch (err) {
      console.error("Failed to generate route:", err);
      openPopup("Route generation failed", "Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const onStartNavigation = () => {
    if (!hasGeneratedRoute) return;

    if (!routeGeoJson) {
      openPopup(
        "Navigation not available yet",
        "This mock route does not include map path data yet. Stats are shown, but turn-by-turn route drawing is unavailable for now."
      );
      return;
    }

    setNavigationMode(true);
    setAutoFollowUser(true);
    setShowRecenter(false);
    markNavigationStarted();
    recenterOnUser();
  };

  const onExitNavigation = () => {
    setNavigationMode(false);
    setRouteGeoJson(null);
    setHasGeneratedRoute(false);
    setAutoFollowUser(false);
    setShowRecenter(false);
    showWholeRoute();
    setStats({
      distance: 0,
      duration: 0,
      shelter: 0,
      sheltersAlongRoute: 0,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={
        navigationMode
          ? "relative h-[calc(100vh-160px)] overflow-hidden -mx-6"
          : "space-y-6 pb-12"
      }
    >
      <RouteMapPanel
        mapContainerRef={mapContainerRef}
        navigationMode={navigationMode}
        showRecenter={showRecenter}
        onRecenter={() => {
          recenterOnUser();
          setShowRecenter(false);
        }}
        hasRoute={hasGeneratedRoute}
        onStartNavigation={onStartNavigation}
        onExitNavigation={onExitNavigation}
      />

      {!navigationMode && (
        <RoutePlanningPanel
          distance={distance}
          setDistance={setDistance}
          isLoop={isLoop}
          setIsLoop={setIsLoop}
          loading={loading}
          hasRoute={hasGeneratedRoute}
          onGenerateRoute={onGenerateRoute}
          stats={stats}
          isLocationReady={locationReady && currentUserPos != null}
        />
      )}

      {permissionState === "denied" && !popup.open && (
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 text-sm text-outline">
          Location permission is denied. Live tracking is unavailable until location access is enabled in browser settings.
        </div>
      )}

      {popup.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-[0_20px_50px_rgba(0,94,83,0.12)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
                  <AlertCircle size={20} />
                </div>

                <div>
                  <h3 className="text-base font-bold tracking-tight text-on-surface">
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