import { motion, AnimatePresence } from "motion/react";

type QuotaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: () => void;
  onUpgrade: () => void;
};

// Toggle this to switch between 1 and 2 tier layouts
const SHOW_PRO_TIER = true;

export function QuotaModal({
  isOpen,
  onClose,
  onSignUp,
  onUpgrade,
}: QuotaModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1117] p-8 shadow-2xl"
              style={{ pointerEvents: "auto" }}
            >
              {/* Glow accent */}
              <div className="pointer-events-none absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

              {/* Close */}
              <button
                onClick={onClose}
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
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-blue-400"
                >
                  <path
                    d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <h2 className="mb-2 text-xl font-semibold tracking-tight text-white">
                Daily limit reached
              </h2>

              {/* Description — changes based on tier */}
              <p className="mb-6 text-sm leading-relaxed text-white/55">
                You've used your{" "}
                <span className="text-white/80">3 free checks</span> for today.{" "}
                {SHOW_PRO_TIER
                  ? "Sign up for a free account to get more, or go Pro for unlimited checks every day."
                  : <>Sign up to get <span className="text-white/80">10 checks/day</span> for free.</>}
              </p>

              {/* Tier cards — only shown when SHOW_PRO_TIER is true */}
              {SHOW_PRO_TIER && (
                <div className="mb-6 grid grid-cols-2 gap-3">
                  {/* Free tier */}
                  <div className="rounded-xl border border-white/8 bg-white/4 p-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-widest text-white/40">
                      Free
                    </p>
                    <p className="text-2xl font-bold text-white">
                      10
                      <span className="ml-1 text-sm font-normal text-white/50">
                        / day
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-white/40">After sign up</p>
                  </div>

                  {/* Pro tier */}
                  <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-blue-500/8 p-4">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                    <p className="mb-1 text-xs font-medium uppercase tracking-widest text-blue-400">
                      Pro
                    </p>
                    <p className="text-2xl font-bold text-white">
                      ∞
                      <span className="ml-1 text-sm font-normal text-white/50">
                        / day
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-blue-400/70">Unlimited</p>
                  </div>
                </div>
              )}

              {/* Single tier — divider shown only when SHOW_PRO_TIER is false */}
              {!SHOW_PRO_TIER && (
                <div className="mb-6 h-px w-full bg-white/8" />
              )}

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={onSignUp}
                  className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-[#0f1117] transition hover:bg-white/90 active:scale-[0.98]"
                >
                  Sign up — it's free
                </button>

                {/* Upgrade button — only shown when SHOW_PRO_TIER is true */}
                {SHOW_PRO_TIER && (
                  <button
                    onClick={onUpgrade}
                    className="w-full rounded-xl border border-blue-500/40 bg-blue-500/10 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20 active:scale-[0.98]"
                  >
                    Upgrade to Pro
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-2 text-xs text-white/30 transition hover:text-white/50"
                >
                  Come back tomorrow
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}