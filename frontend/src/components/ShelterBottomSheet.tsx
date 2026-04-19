import { motion } from "motion/react";
import {
  Navigation,
  Navigation2,
  Footprints,
  Share2,
  XCircle,
  Loader2,
} from "lucide-react";

type ShelterBottomSheetProps = {
  navigationMode?: boolean;
  shelterName?: string;
  distanceM?: number;
  durationMin?: number;
  onNavigate: () => void;
  onExitNavigation: () => void;
  isShelterReady: boolean;
  isLoading?: boolean;
};

export default function ShelterBottomSheet({
  navigationMode = false,
  shelterName = "Marina Bay Sands Shelter",
  distanceM = 350,
  durationMin = 5,
  onNavigate,
  onExitNavigation,
  isShelterReady,
  isLoading,
}: ShelterBottomSheetProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="absolute bottom-6 left-4 right-4 z-40"
    >
      <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-[0_20px_50px_rgba(0,94,83,0.12)]">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-container-high"></div>

        {!navigationMode ? (
          <>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-md bg-secondary-container px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-on-secondary-container">
                    Shelter
                  </span>
                  <span className="text-sm font-medium tracking-tight text-outline">
                    Nearby safe point
                  </span>
                </div>
                <h2 className="font-headline text-2xl font-bold leading-tight tracking-tight text-on-surface">
                  {shelterName}
                </h2>
              </div>

              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-outline">
                <Share2 size={18} />
              </button>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest text-primary">
                  <Navigation2 size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
                    Distance
                  </p>
                  <p className="font-bold text-on-surface">{distanceM}m</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest text-primary">
                  <Footprints size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
                    Time
                  </p>
                  <p className="font-bold text-on-surface">{durationMin} mins</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
              onClick={onNavigate}
              disabled={!isShelterReady || isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-4 font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin [animation-duration:0.7s]" />
                  Loading route...
                </>
              ) : isShelterReady ? (
                <>
                  <Navigation size={20} fill="currentColor" />
                  Navigate Now
                </>
              ) : (
                <>
                  <Loader2 size={20} className="animate-spin [animation-duration:0.7s]" />
                  Finding Shelter...
                </>
              )}
            </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={onExitNavigation}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-high py-4 font-bold text-on-surface transition-all hover:bg-surface-container-low active:scale-95"
            >
              <XCircle size={20} />
              Exit Navigation
            </button>
            <div className="mb-6 text-center">
              <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
                <Navigation size={22} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-on-surface">
                Navigation in progress
              </h2>
              <p className="mt-1 text-sm text-outline">
                Heading to {shelterName}
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}