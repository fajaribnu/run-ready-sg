import { useState } from "react";
import { motion } from "motion/react";
import { Thermometer, Wind, ShieldCheck } from "lucide-react";
import HomeHero from "../components/CheckRun";
import { type UseGuestQuotaReturn } from "../map/useGuestQuota";

type LandingViewProps = {
  loading: boolean;
  quota: UseGuestQuotaReturn;
  onCheckRunNow: () => boolean; // returns true = allowed, false = quota exhausted
  onShowQuotaModal: () => void;
};

const HOW_IT_WORKS = [
  {
    icon: Thermometer,
    title: "Heat index",
    desc: "Temperature + humidity — how it actually feels on your skin.",
  },
  {
    icon: Wind,
    title: "Wind & rain",
    desc: "Current wind speed and precipitation probability factored in.",
  },
  {
    icon: ShieldCheck,
    title: "Go / No-go",
    desc: "A clear verdict so you can decide in seconds.",
  },
];

export function LandingView({
  loading,
  quota,
  onCheckRunNow,
  onShowQuotaModal,
}: LandingViewProps) {
  const { checksUsed, checksRemaining, limit, isExhausted } = quota;

  // Tracks whether the user has successfully run a check this session.
  // Driven by the RETURN VALUE of onCheckRunNow — not by quota state —
  // so it never flips on a stale render after quota is exhausted.
  const [hasChecked, setHasChecked] = useState(false);

  const handleCheckRunNow = () => {
    const allowed = onCheckRunNow();
    if (allowed) setHasChecked(true);
    // If !allowed, App.tsx has already opened the QuotaModal — nothing to do here
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <HomeHero
        loading={loading}
        hasChecked={hasChecked}
        onCheckRunNow={handleCheckRunNow}
      />

      {/* Quota pip bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="flex items-center gap-3"
      >
        <div className="flex gap-1.5">
          {Array.from({ length: limit }).map((_, i) => (
            <span
              key={i}
              className={`block h-1 w-8 rounded-full transition-colors duration-300 ${
                i < checksUsed ? "bg-on-surface/15" : "bg-primary/50"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-on-surface-variant">
          {isExhausted ? (
            <>
              Limit reached —{" "}
              <button
                onClick={onShowQuotaModal}
                className="text-primary underline underline-offset-2"
              >
                sign up for more
              </button>
            </>
          ) : (
            <>
              {checksRemaining} free check{checksRemaining !== 1 ? "s" : ""} left
              today
            </>
          )}
        </span>
      </motion.div>

      {/* Divider */}
      <div className="h-px bg-on-surface/8" />

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant/60">
          How it works
        </p>

        {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.28 + i * 0.07 }}
            className="flex items-start gap-4 rounded-2xl bg-surface-variant/40 px-4 py-3.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Icon size={17} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
                {desc}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Social proof */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="text-center text-xs text-on-surface-variant/50"
      >
        Used by runners in Singapore every morning ☀️
      </motion.p>
    </motion.div>
  );
}