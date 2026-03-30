import { Umbrella } from "lucide-react";

export default function ShelterMapLayer({
  currentUserPos,
  shelters = [],
  selectedShelter,
  onSelectShelter,
}) {
  const markerPositions = [
    "top-[45%] left-[60%]",
    "top-[65%] left-[55%]",
    "top-[40%] left-[45%]",
  ];

  return (
    <div className="absolute inset-0 map-mesh">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 100 Q 250 50 400 200 T 800 150"
            fill="none"
            stroke="#005e53"
            strokeWidth="40"
          />
          <path
            d="M100 0 Q 150 250 50 400 T 200 800"
            fill="none"
            stroke="#005e53"
            strokeWidth="20"
          />
        </svg>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 bg-primary/10 rounded-full animate-pulse"></div>
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-primary">
            <div className="w-4 h-4 bg-primary rounded-full"></div>
          </div>
        </div>
      </div>

      {shelters.map((shelter, index) => {
        const posClass = markerPositions[index] || markerPositions[0];
        const isSelected = selectedShelter?.name === shelter.name;
        const isPrimary = index === 0;

        if (isPrimary) {
          return (
            <button
              key={shelter.name}
              className={`absolute ${posClass} group`}
              onClick={() => onSelectShelter(shelter)}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`bg-primary text-white p-2 rounded-2xl shadow-xl transition-transform group-hover:scale-110 active:scale-90 ${
                    isSelected ? "ring-4 ring-primary/20" : ""
                  }`}
                >
                  <Umbrella size={24} fill="currentColor" />
                </div>
                <div className="mt-2 px-3 py-1 bg-surface-container-lowest rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-primary">
                    {shelter.name}
                  </span>
                </div>
              </div>
            </button>
          );
        }

        return (
          <button
            key={shelter.name}
            className={`absolute ${posClass} group`}
            onClick={() => onSelectShelter(shelter)}
          >
            <div
              className={`bg-surface-container-lowest text-primary p-2 rounded-2xl shadow-md border-2 hover:border-primary transition-all ${
                isSelected ? "border-primary" : "border-primary/20"
              }`}
            >
              <Umbrella size={24} />
            </div>
          </button>
        );
      })}
    </div>
  );
}