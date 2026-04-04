import { CheckCircle2, AlertTriangle } from "lucide-react";

export default function RunStatusCard({ result }) {
  const isSafe = result?.status === "SAFE";
  const data = result?.data ?? {};

  return (
    <section className="relative">
      <div
        className={`relative flex flex-col items-center space-y-4 overflow-hidden rounded-xl p-8 text-center ${
          isSafe ? "bg-secondary-container" : "bg-error-container"
        }`}
      >
        <div
          className={`absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full blur-3xl ${
            isSafe ? "bg-on-secondary-container/5" : "bg-on-error-container/10"
          }`}
        />

        <div
          className={`rounded-full p-4 ${
            isSafe ? "bg-on-secondary-container/10" : "bg-on-error-container/10"
          }`}
        >
          {isSafe ? (
            <CheckCircle2
              size={48}
              className="text-on-secondary-container"
            />
          ) : (
            <AlertTriangle
              size={48}
              className="text-on-error-container"
            />
          )}
        </div>

        <div className="space-y-1">
          <h2
            className={`text-5xl font-extrabold uppercase tracking-tighter ${
              isSafe ? "text-on-secondary-container" : "text-on-error-container"
            }`}
          >
            {result?.status}
          </h2>
          <p
            className={`text-lg font-medium leading-snug ${
              isSafe ? "text-on-secondary-container" : "text-on-error-container"
            }`}
          >
            {isSafe ? "Low WBGT, conditions look good." : data?.projection || "Conditions are not ideal right now."}
          </p>
        </div>

        <div className="pt-2">
          <span
            className={`text-xs font-bold uppercase tracking-widest ${
              isSafe ? "text-on-secondary-container/60" : "text-on-error-container/70"
            }`}
          >
            {data?.location || "Current location"}
          </span>
        </div>

        {!isSafe && Array.isArray(data?.reasons) && data.reasons.length > 0 && (
        <div className="pt-3 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-on-error-container/60 text-center">
            Reasons
            </p>

            <div className="space-y-1">
            {data.reasons.map((reason) => (
                <p
                key={reason}
                className="text-xs font-bold text-on-error-container/80 text-center leading-snug"
                >
                • {reason}
                </p>
            ))}
            </div>
        </div>
        )}
      </div>
    </section>
  );
}