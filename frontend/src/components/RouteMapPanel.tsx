import { Navigation, XCircle } from "lucide-react";
import type { RefObject } from "react";

type RouteMapPanelProps = {
  mapContainerRef: RefObject<HTMLDivElement | null>;
  navigationMode: boolean;
  showRecenter: boolean;
  onRecenter: () => void;
  hasRoute: boolean;
  onStartNavigation: () => void;
  onExitNavigation: () => void;
};

export function RouteMapPanel({
  mapContainerRef,
  navigationMode,
  showRecenter,
  onRecenter,
  hasRoute,
  onStartNavigation,
  onExitNavigation,
}: RouteMapPanelProps) {
  return (
    <section
      className={`relative w-full overflow-hidden bg-surface-container-high shadow-inner ${
        navigationMode ? "h-full rounded-none" : "h-[400px] rounded-3xl"
      }`}
    >
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      <div className="absolute left-6 top-6 z-30 flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-full bg-surface-container-lowest/80 px-4 py-2 shadow-sm backdrop-blur-md">
          <div className="h-3 w-3 rounded-full bg-primary"></div>
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Sheltered Route
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-surface-container-lowest/80 px-4 py-2 shadow-sm backdrop-blur-md">
          <div className="h-3 w-3 rounded-full bg-outline-variant"></div>
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Exposed Route
          </span>
        </div>
      </div>

      {showRecenter && (
        <button
          onClick={onRecenter}
          className={`absolute right-6 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-xl transition-opacity hover:opacity-90 active:scale-95 ${
            navigationMode ? "bottom-24" : "bottom-6"
          }`}
        >
          <Navigation size={24} fill="currentColor" />
        </button>
      )}

      {hasRoute && (
        <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2">
          {!navigationMode ? (
            <button
              onClick={onStartNavigation}
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95"
            >
              <Navigation size={20} />
              Start navigation
            </button>
          ) : (
            <button
              onClick={onExitNavigation}
              className="flex items-center justify-center gap-2 rounded-full bg-surface-container-lowest px-6 py-4 font-bold text-on-surface shadow-lg transition-all hover:bg-surface-container-high active:scale-95"
            >
              <XCircle size={20} />
              Exit navigation
            </button>
          )}
        </div>
      )}
    </section>
  );
}