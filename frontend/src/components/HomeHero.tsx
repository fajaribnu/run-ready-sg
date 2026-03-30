import { Footprints, LoaderCircle } from "lucide-react";

export default function HomeHero({ loading, onCheckRunNow }) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold leading-none tracking-tight text-on-surface">
          Ready for your <span className="text-primary">daily run?</span>
        </h1>
        <p className="text-lg text-on-surface-variant">
          Check the heat index before you head out.
        </p>
      </div>

      <button
        onClick={onCheckRunNow}
        disabled={loading}
        className="flex h-16 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-primary to-primary-container text-lg font-bold text-on-primary shadow-[0_12px_40px_rgba(0,94,83,0.15)] transition-all duration-200 active:scale-95 disabled:opacity-70"
      >
        <span>{loading ? "Checking conditions..." : "Should I run now?"}</span>
        {loading ? <LoaderCircle size={20} className="animate-spin" /> : <Footprints size={20} fill="currentColor" />}
      </button>
    </section>
  );
}