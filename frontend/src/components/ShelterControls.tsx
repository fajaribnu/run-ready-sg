import { Navigation } from "lucide-react";

export default function ShelterControls({ onRecenter, showRecenter }) {
  return (
    <div className="absolute right-6 top-6 z-30 flex flex-col gap-3">
      {showRecenter && (
        <button
          onClick={onRecenter}
          className="w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95"
        >
          <Navigation size={20} fill="currentColor" />
        </button>
      )}
    </div>
  );
}