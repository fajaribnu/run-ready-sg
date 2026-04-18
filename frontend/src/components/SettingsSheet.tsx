import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

type SettingsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  emailAlertOptIn: boolean;
  onEmailAlertOptInChange: (nextValue: boolean) => void;
};

export function SettingsSheet({
  isOpen,
  onClose,
  emailAlertOptIn,
  onEmailAlertOptInChange,
}: SettingsSheetProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
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
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ pointerEvents: "none" }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Settings"
              className="relative w-full max-w-md rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-2xl"
              style={{ pointerEvents: "auto" }}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-headline text-2xl font-extrabold tracking-tight text-primary">
                  Settings
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <section className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-4">
                <h3 className="font-headline text-lg font-bold text-on-surface">Alerts</h3>

                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-on-surface-variant">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-outline text-primary"
                    checked={emailAlertOptIn}
                    onChange={(event) => onEmailAlertOptInChange(event.target.checked)}
                  />
                  <span>
                    Opt in for email alert subscription for warning forecast of whether its suitable to run for the current location.
                  </span>
                </label>
              </section>
            </section>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    ,
    document.body,
  );
}
