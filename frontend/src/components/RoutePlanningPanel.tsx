import { Sparkles, Loader2, CloudRain, MapPin, Navigation } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

type RoutePlanningPanelProps = {
  distance: number;
  setDistance: (value: number) => void;
  isLoop: boolean;
  setIsLoop: (value: boolean) => void;
  loading: boolean;
  hasRoute: boolean;
  onGenerateRoute: () => void;
  isGuest: boolean;
  onRequireLogin?: () => void;
  isLocationReady: boolean;
  stats: {
    distance: number;
    duration: number;
    shelter: number;
    sheltersAlongRoute: number;
  };
  mode: "distance" | "destination";
  onModeChange: (mode: "distance" | "destination") => void;
  destSet: boolean;
};

export function RoutePlanningPanel({
  distance,
  setDistance,
  isLoop,
  setIsLoop,
  loading,
  hasRoute,
  onGenerateRoute,
  isGuest,
  onRequireLogin,
  isLocationReady,
  stats,
  mode,
  onModeChange,
  destSet,
}: RoutePlanningPanelProps) {
  const isButtonDisabled =
    loading ||
    !isLocationReady ||
    (mode === "destination" && !destSet);

  const handleGenerate = () => {
    if (isGuest) {
      onRequireLogin?.();
      return;
    }
    onGenerateRoute();
  };

  return (
    <section className="space-y-6">
      <AnimatePresence initial={false}>
        {hasRoute && (
          <motion.div
            key="route-stats"
            initial={{ opacity: 0, y: -24, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -16, height: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-6 overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Distance", value: stats.distance, unit: "km" },
                { label: "Duration", value: stats.duration, unit: "m" },
                {
                  label: "Shelter",
                  value: stats.shelter,
                  unit: "%",
                  color: "text-on-secondary-container",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center justify-center rounded-2xl bg-surface-container-lowest p-6 text-center shadow-sm"
                >
                  <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-outline-variant">
                    {stat.label}
                  </span>
                  <span
                    className={`font-headline text-3xl font-extrabold tracking-tight ${
                      stat.color || "text-primary"
                    }`}
                  >
                    {stat.value}
                    <span className="text-sm font-medium">{stat.unit}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-secondary-container bg-secondary-container/30 p-6">
              <CloudRain size={32} className="text-on-secondary-container" />
              <div>
                <h4 className="font-headline font-bold text-on-secondary-container">
                  Weather Advisory
                </h4>
                <p className="text-sm leading-relaxed text-on-secondary-container/80">
                  Your generated route passes by {stats.sheltersAlongRoute} shelter
                  points and keeps approximately {stats.shelter}% of the route under
                  shelter coverage.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm">
        <div className="space-y-8">

          {/* Mode switcher */}
          <div className="flex rounded-2xl bg-surface-container-high p-1">
            {(["distance", "destination"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`flex-1 rounded-xl py-2 text-sm font-bold transition-all ${
                  mode === m
                    ? "bg-primary text-on-primary shadow"
                    : "text-outline"
                }`}
              >
                {m === "distance" ? "By Distance" : "By Destination"}
              </button>
            ))}
          </div>

          {mode === "distance" ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="font-headline text-lg font-bold">
                    Target Distance
                  </label>
                  <span className="rounded-full bg-primary-container px-3 py-1 text-sm font-bold text-white">
                    {distance.toFixed(1)} km
                  </span>
                </div>

                <input
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-container-high accent-primary"
                  max="20"
                  min="1"
                  step="0.5"
                  type="range"
                  value={distance}
                  onChange={(e) => setDistance(parseFloat(e.target.value))}
                />

                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter text-outline-variant">
                  <span>1km</span>
                  <span>5km</span>
                  <span>10km</span>
                  <span>15km</span>
                  <span>20km+</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-headline text-lg font-bold">Loop Route</span>
                <button
                  onClick={() => setIsLoop(!isLoop)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 ${
                    isLoop ? "bg-primary" : "bg-surface-container-high"
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${
                      isLoop ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="font-bold text-on-surface">
                  {isLoop ? "ON" : "OFF"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-5">
              <Navigation size={24} className={destSet ? "text-primary" : "text-outline"} />
              <p className="text-sm leading-relaxed text-outline">
                {destSet
                  ? "Destination set — tap the map to change it."
                  : "Tap anywhere on the map to set your destination."}
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isButtonDisabled}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-primary px-10 py-5 font-headline text-lg font-extrabold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin [animation-duration:0.7s]" />
                Generating...
              </>
            ) : !isLocationReady ? (
              <>
                <MapPin size={20} />
                Getting your location...
              </>
            ) : mode === "destination" && !destSet ? (
              <>
                <Navigation size={20} />
                Set destination on map
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate route
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}