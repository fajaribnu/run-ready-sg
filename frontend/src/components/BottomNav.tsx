import React from 'react';
import { Home, Umbrella, Map as MapIcon, Clock } from 'lucide-react';
import { cn, type Tab } from '../types';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'shelter', label: 'Shelter', icon: Umbrella },
    { id: 'route', label: 'Route', icon: MapIcon },
    { id: 'time', label: 'Time', icon: Clock },
  ] as const;

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-60 flex justify-around items-center p-2 glass rounded-full shadow-[0_12px_40px_rgba(24,29,27,0.08)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300",
              isActive 
                ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" 
                : "text-on-surface-variant hover:bg-surface-container-low"
            )}
          >
            <Icon size={20} fill={isActive ? "currentColor" : "none"} />
            <span className="font-medium text-[10px] uppercase tracking-wider mt-1">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
