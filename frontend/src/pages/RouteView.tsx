import { useRef, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, X } from "lucide-react";
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

type RouteViewProps = {
  isGuest?: boolean;
  onRequireLogin?: () => void;
};

export const RouteView = ({ isGuest, onRequireLogin }: RouteViewProps) => {
  const [distance, setDistance] = useState(5);
  const [isLoop, setIsLoop] = useState(true);
  const [mode, setMode] = useState<"distance" | "destination">("distance");
  const [destPos, setDestPos] = useState<{ lat: number; lng: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [navigationMode, setNavigationMode] = useState(false);

  const [routeGeoJson, setRouteGeoJson] = useState<any>(null);
  const [hasGeneratedRoute, setHasGeneratedRoute] = useState(false);

  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

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
    selectedRouteIndex,
    navigationMode,
    autoFollowUser,
    setAutoFollowUser,
    setShowRecenter,
    onMapClick:
      mode === "destination" && !navigationMode
        ? (lat, lng) => setDestPos({ lat, lng })
        : undefined,
    destPos,
    showLinkways: !isGuest,
  });

  const openPopup = (title: string, message: string) => {
    setPopup({ open: true, title, message });
  };

  const closePopup = () => {
    setPopup((prev) => ({ ...prev, open: false }));
  };

  const onGenerateRoute = async () => {
    if (!currentUserPos) return;

    setLoading(true);
    setNavigationMode(false);
    setAutoFollowUser(false);
    setShowRecenter(false);
    setSelectedRouteIndex(0);

    try {
      const res = await planRoute(
        currentUserPos.lat,
        currentUserPos.lng,
        distance,
        mode === "distance" ? isLoop : false,
        mode === "destination" ? destPos?.lat ?? null : null,
        mode === "destination" ? destPos?.lng ?? null : null,
      );

      const features = res?.features;
      if (!features || features.length === 0) {
        openPopup("No route found", "We could not generate a route right now.");
        return;
      }

      const firstCoords = features[0]?.geometry?.coordinates;
      if (!Array.isArray(firstCoords) || firstCoords.length < 2) {
        openPopup("No route found", "The route generated is invalid.");
        setRouteGeoJson(null);
        return;
      }

      setHasGeneratedRoute(true);

      const firstProps = features[0]?.properties ?? {};
      setStats({
        distance: firstProps.distance_km ?? distance,
        duration: Math.round((firstProps.distance_km ?? distance) * 6),
        shelter: Math.round(firstProps.shelter_pct ?? 0),
        sheltersAlongRoute: firstProps.shelters_along_route ?? 0,
      });

      setRouteGeoJson(res);
    } catch (err) {
      console.error("Failed to generate route:", err);
      openPopup("Route generation failed", "Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const onSelectRoute = (index: number) => {
    setSelectedRouteIndex(index);
    const feature = routeGeoJson?.features?.[index];
    if (feature) {
      const props = feature.properties ?? {};
      setStats({
        distance: props.distance_km ?? distance,
        duration: Math.round((props.distance_km ?? distance) * 6),
        shelter: Math.round(props.shelter_pct ?? 0),
        sheltersAlongRoute: props.shelters_along_route ?? 0,
      });
    }
  };

  const onStartNavigation = () => {
    if (!hasGeneratedRoute) return;
    if (!routeGeoJson) {
      openPopup("Navigation not available yet", "This mock route does not include map path data yet.");
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
    setSelectedRouteIndex(0);
    showWholeRoute();
    setStats({ distance: 0, duration: 0, shelter: 0, sheltersAlongRoute: 0 });
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

      {!navigationMode && hasGeneratedRoute && routeGeoJson?.features?.length > 1 && (
        <div className="flex gap-2">
          {routeGeoJson.features.map((f: any, i: number) => {
            const color = f.properties?.stroke ?? "#888";
            const dist = f.properties?.distance_km ?? "?";
            const isActive = i === selectedRouteIndex;
            return (
              <button
                key={i}
                onClick={() => onSelectRoute(i)}
                className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "border-transparent bg-primary text-on-primary"
                    : "border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant"
                }`}
              >
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ background: color }}
                />
                Route {i + 1} · {dist}km
              </button>
            );
          })}
        </div>
      )}

      {!navigationMode && (
        <RoutePlanningPanel
          distance={distance}
          setDistance={setDistance}
          isLoop={isLoop}
          setIsLoop={setIsLoop}
          loading={loading}
          hasRoute={hasGeneratedRoute}
          onGenerateRoute={onGenerateRoute}
          isGuest={isGuest ?? false}
          onRequireLogin={onRequireLogin}
          stats={stats}
          isLocationReady={locationReady && currentUserPos != null}
          mode={mode}
          onModeChange={(m) => {
            setMode(m);
            setDestPos(null);
          }}
          destSet={destPos !== null}
        />
      )}

      {permissionState === "denied" && !popup.open && (
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 text-sm text-outline">
          Location permission is denied. Live tracking is unavailable until
          location access is enabled in browser settings.
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