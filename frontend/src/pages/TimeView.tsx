import { useState } from 'react';
import { Search, Sparkles, Sunrise, Sun, AlertTriangle, Info, Thermometer, Lock } from 'lucide-react';
import { motion } from 'motion/react';
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

export const TimeView = ({ isGuest, onRequireLogin }: TimeViewProps) => {
  const [duration, setDuration] = useState(45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [windows, setWindows] = useState<BestTimeWindow[]>([]);
  const [lastLocationLabel, setLastLocationLabel] = useState('');

  const { currentUserPos } = useLocation();

  const onFindBestTime = async () => {
    if (isGuest) {
      onRequireLogin?.();
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

        <button
          type="button"
          onClick={onFindBestTime}
          disabled={loading}
          className={cn(
            "rounded-3xl p-8 flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:opacity-90 active:scale-95 shadow-lg group disabled:opacity-70 disabled:cursor-not-allowed",
            isGuest
              ? "bg-surface-container-lowest shadow-sm"
              : "bg-primary text-on-primary shadow-primary/20"
          )}
        >
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform",
            isGuest ? "bg-primary/10 ring-1 ring-primary/20" : "bg-primary-container"
          )}>
            {isGuest
              ? <Lock size={28} className="text-primary" />
              : <Search size={32} />
            }
          </div>
          <span className={cn(
            "font-headline font-bold text-lg",
            isGuest ? "text-on-surface" : ""
          )}>
            {loading ? 'Finding...' : 'Find best time'}
          </span>
        </button>
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
    </motion.div>
  );
};