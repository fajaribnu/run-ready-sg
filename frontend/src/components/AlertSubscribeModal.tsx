import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, X } from "lucide-react";
import { subscribeAlert } from "../services/api";

interface AlertSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLat?: number;
  defaultLng?: number;
  defaultLabel?: string;
}

export function AlertSubscribeModal({
  isOpen,
  onClose,
  defaultLat = 1.352083,
  defaultLng = 103.819836,
  defaultLabel = "",
}: AlertSubscribeModalProps) {
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState(defaultLabel);
  const [lat, setLat] = useState(defaultLat.toString());
  const [lng, setLng] = useState(defaultLng.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      await subscribeAlert(email, parseFloat(lat), parseFloat(lng), label);
      setSuccess(true);
      setEmail("");
      setLabel("");
      setLat("");
      setLng("");

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setLabel("");
    setLat("");
    setLng("");
    setError(null);
    setSuccess(false);
    onClose();
  };

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
            onClick={handleClose}
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
              className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1117] p-6 shadow-2xl"
              style={{ pointerEvents: "auto" }}
            >
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 rounded-full p-1 text-white/40 transition hover:text-white/80"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <Bell size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white">
                    Subscribe to Alerts
                  </h2>
                  <p className="text-xs text-white/55">
                    Get notified about weather conditions
                  </p>
                </div>
              </div>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-green-500/10 p-4 text-center"
                >
                  <p className="text-sm font-medium text-green-400">
                    Successfully subscribed!
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/70">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/70">
                      Location label (optional)
                    </label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g., Bishan Park"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white/70">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                        placeholder="1.352083"
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white/70">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={lng}
                        onChange={(e) => setLng(e.target.value)}
                        placeholder="103.819836"
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-500/10 p-3">
                      <p className="text-xs text-red-400">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "Subscribing..." : "Subscribe"}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
