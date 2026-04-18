import { useState } from 'react';
import { Search, Sparkles, Sunrise, Sun, AlertTriangle, Info, Thermometer, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../types';
import { bestTimes } from '../services/api';
import { useLocation } from '../components/LocationProvider';

type BestTimeWindow = {
  rank: number;
  start_time: string;
  end_time: string;
  forecast: string;
  wbgt: number;
  score: number;
  label: string;
};

type TimeViewProps = {
  isGuest?: boolean;
  onRequireLogin?: () => void;
};

export const TimeView = ({ isGuest = false, onRequireLogin }: TimeViewProps) => {
  const [duration, setDuration] = useState(45);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [windows, setWindows] = useState<BestTimeWindow[]>([]);
  const [lastLocationLabel, setLastLocationLabel] = useState('');

  const { currentUserPos } = useLocation();

  const onFindBestTime = async () => {
    // Gate: guests must log in first
    if (isGuest) {
      setShowLoginModal(true);
      return;
    }

    setLoading(true);
    setError('');

    const lat = currentUserPos?.lat ?? 1.35;
    const lng = currentUserPos?.lng ?? 103.82;

    try {
      const res = await bestTimes(lat, lng, duration);
      setWindows(Array.isArray(res?.windows) ? res.windows : []);
      setLastLocationLabel(typeof res?.location === 'string' ? res.location : '');
    } catch (err) {
      console.error('Failed to find best run time:', err);
      setWindows([]);
      setError('Unable to fetch best time windows. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styleByLabel = (label: string) => {
    const normalized = (label || '').toLowerCase();
    if (normalized.includes('best')) return { type: 'optimal', icon: Sunrise };
    if (normalized.includes('good')) return { type: 'endurance', icon: Sun };
    return { type: 'warning', icon: AlertTriangle };
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 pb-12"
    >
      {/* Hero Section */}
      <section className="space-y-4">
        <h1 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight leading-none">
          Optimal Window
        </h1>
        <p className="text-on-surface-variant text-lg">
          Plan your run around the Singapore heat and humidity for peak performance.
        </p>
      </section>

      {/* Duration Selection */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-3xl flex flex-col justify-between min-h-[220px] shadow-sm">
          <div>
            <span className="text-[10px] text-primary font-black uppercase tracking-widest">
              Run Duration
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-headline font-extrabold text-5xl text-primary">{duration}</span>
              <span className="font-bold text-on-surface-variant">MINS</span>
            </div>
          </div>
          <div className="w-full mt-6">
            <input
              className="w-full h-2 bg-surface-container-high rounded-full appearance-none accent-primary"
              max="120" min="15" step="5" type="range"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
            />
            <div className="flex justify-between mt-3 text-xs font-bold text-outline-variant uppercase">
              <span>15m</span>
              <span>120m</span>
            </div>
          </div>
        </div>

        {/* Find Best Time button — guest shows lock, authenticated shows search */}
        {isGuest ? (
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="bg-surface-container-lowest p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:opacity-90 active:scale-95 shadow-sm group"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ring-1 ring-primary/20">
              <Lock size={28} className="text-primary" />
            </div>
            <span className="font-headline font-bold text-lg text-on-surface">
              Find best time
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onFindBestTime}
            disabled={loading}
            className="bg-primary text-on-primary rounded-3xl p-8 flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:opacity-90 active:scale-95 shadow-lg shadow-primary/20 group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Search size={32} />
            </div>
            <span className="font-headline font-bold text-lg">
              {loading ? 'Finding...' : 'Find best time'}
            </span>
          </button>
        )}
      </section>

      {/* Results List */}
      <section className="space-y-4">
        <h2 className="font-headline font-bold text-xl flex items-center gap-2">
          <Sparkles size={20} className="text-primary" />
          Suggested Windows{lastLocationLabel ? ` • ${lastLocationLabel}` : ''}
        </h2>

        {error && (
          <div className="bg-error-container text-error p-4 rounded-2xl text-sm font-semibold">
            {error}
          </div>
        )}

        {!loading && !error && windows.length === 0 && (
          <div className="bg-surface-container-low p-4 rounded-2xl text-sm text-on-surface-variant">
            {isGuest
              ? 'Log in to fetch personalized time windows.'
              : 'Tap "Find best time" to fetch personalized time windows.'}
          </div>
        )}

        <div className="space-y-3">
          {windows.map((window) => {
            const { type, icon: Icon } = styleByLabel(window.label);
            const isWarning = type === 'warning';

            return (
              <div
                key={`${window.rank}-${window.start_time}-${window.end_time}`}
                className={cn(
                  "bg-surface-container-lowest p-5 rounded-2xl flex items-center justify-between group hover:bg-surface-container-low transition-colors duration-300 shadow-sm",
                  isWarning && "border-l-4 border-error"
                )}
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center",
                    isWarning ? "bg-error-container" : "bg-secondary-container"
                  )}>
                    <Icon size={24} className={isWarning ? "text-error" : "text-on-secondary-container"} />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-lg leading-tight">
                      {window.start_time}-{window.end_time}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={cn(
                        "flex items-center text-sm font-bold",
                        isWarning ? "text-error" : "text-on-surface-variant"
                      )}>
                        <Thermometer size={14} className="mr-1" /> {window.wbgt} WBGT
                      </span>
                      <span className="w-1 h-1 bg-outline-variant rounded-full" />
                      <span className={cn(
                        "text-sm font-bold",
                        isWarning ? "text-on-surface-variant" : "text-on-secondary-container"
                      )}>
                        {window.forecast}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "font-headline font-extrabold text-2xl flex items-center justify-end gap-1",
                    isWarning ? "text-error" : "text-secondary"
                  )}>
                    {window.score}<span className="text-sm font-bold text-outline-variant">/100</span>
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase tracking-widest font-black",
                    isWarning ? "text-error" : "text-secondary"
                  )}>
                    {window.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Informational Card */}
      <section className="bg-surface-container-low p-6 rounded-3xl">
        <div className="flex gap-4">
          <div className="bg-surface-container-lowest p-3 rounded-full h-fit shadow-sm">
            <Info size={20} className="text-tertiary" />
          </div>
          <div>
            <h4 className="font-headline font-bold text-on-surface">Heat Safety Algorithm</h4>
            <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
              Safety scores are calculated based on humidity, UV radiation, and real-time shelter
              availability along your routes.
            </p>
          </div>
        </div>
      </section>

      {/* Login gate modal */}
      <AnimatePresence>
        {showLoginModal && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowLoginModal(false)}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1117] p-8 shadow-2xl">

                {/* Close */}
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="absolute right-4 top-4 rounded-full p-1 text-white/40 transition hover:text-white/80"
                  aria-label="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M4 4l10 10M14 4L4 14"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                {/* Icon */}
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <Lock size={20} className="text-primary" />
                </div>

                <h2 className="mb-2 text-xl font-semibold tracking-tight text-white">
                  Login required
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-white/55">
                  Sign in or create an account to find optimal running time windows.
                </p>

                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      setShowLoginModal(false);
                      onRequireLogin?.();
                    }}
                    className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-[#0f1117] transition hover:bg-white/90 active:scale-[0.98]"
                  >
                    Sign up
                  </button>
                  <button
                    onClick={() => {
                      setShowLoginModal(false);
                      onRequireLogin?.();
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-[0.98]"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => setShowLoginModal(false)}
                    className="w-full py-2 text-xs text-white/30 transition hover:text-white/50"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};