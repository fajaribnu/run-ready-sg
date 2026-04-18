import { motion, AnimatePresence } from "motion/react";
import { Lock } from "lucide-react";

type LoginRequiredModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: () => void;
  onLogin: () => void;
};

export function LoginRequiredModal({
  isOpen,
  onClose,
  onSignUp,
  onLogin,
}: LoginRequiredModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - full screen, BottomNav floats above via its own z-index */}
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
                   {/* Modal */}
              {/* Glow accent */}
<!--               <div className="pointer-events-none absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
 -->
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
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Lock size={20} className="text-primary" />
              </div>

              <h2 className="mb-2 text-xl font-semibold tracking-tight text-white">
                Login required
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-white/55">
                Sign in or create an account to use shelter, route, and time recommendations.
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={onSignUp}
                  className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-[#0f1117] transition hover:bg-white/90 active:scale-[0.98]"
                >
                  Sign up
                </button>
                <button
                  onClick={onLogin}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-[0.98]"
                >
                  Log in
                </button>
                <button
                  onClick={onClose}
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
  );
}
