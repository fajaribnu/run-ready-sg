import { Umbrella, Map as MapIcon, Clock, ChevronRight } from "lucide-react";

const actions = [
  { label: "Find Shelter", icon: Umbrella, tab: "shelter" },
  { label: "Plan Route", icon: MapIcon, tab: "route" },
  { label: "Best Time", icon: Clock, tab: "time" },
];

type QuickActionsProps = {
  onNavigate: (tab: "home" | "shelter" | "route" | "time") => void;
};

export default function QuickActions({ onNavigate }: QuickActionsProps) {
  return (
    <section className="space-y-4">
      <h3 className="px-1 text-sm font-bold uppercase tracking-widest text-on-surface-variant/70">
        Quick Actions
      </h3>

      <div className="flex flex-col gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onNavigate(action.tab as "shelter" | "route" | "time")}
            className="group flex w-full items-center justify-between rounded-2xl bg-surface-container-lowest p-5 text-left shadow-sm transition-colors hover:bg-surface-container-high active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <action.icon size={20} />
              </div>
              <span className="font-bold text-on-surface">{action.label}</span>
            </div>

            <ChevronRight size={20} className="text-outline-variant" />
          </button>
        ))}
      </div>
    </section>
  );
}