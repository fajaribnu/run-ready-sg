import React from 'react';
import { MapPin, Bell, Search, CloudRain } from 'lucide-react';
import { cn, type Tab } from '../types';

interface TopBarProps {
  activeTab: Tab;
  location?: string;
  rainWarning?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTab, location = "Marina Bay", rainWarning }) => {
  return (
    <header className="bg-background/70 backdrop-blur-xl flex items-center justify-between px-6 py-4 w-full sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <MapPin size={20} className="text-primary" />
        <span className="font-headline font-bold tracking-tight text-lg text-primary">
          {activeTab === 'home' ? location : "Run Ready SG"}
        </span>
      </div>

      {activeTab === 'home' && (
        <div className="font-headline font-extrabold text-primary tracking-tighter text-xl">
          Run Ready SG
        </div>
      )}

      <div className="flex items-center gap-3">
        {activeTab === 'shelter' && (
          <div className="flex items-center gap-1 bg-secondary-container px-3 py-1 rounded-full text-on-secondary-container text-xs font-bold">
            <CloudRain size={14} />
            <span>Rain in 12m</span>
          </div>
        )}
        
        <button className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:opacity-80 transition-opacity active:scale-95">
          {activeTab === 'shelter' ? <Search size={20} /> : <Bell size={20} className="text-primary" />}
        </button>

        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant/20">
          <img 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmtDBqYqN7j3pXILe3HB3sQ2oaFGn1YeHluJTcdy4_QtfUak-LZjEpdgwq5uEjXbSFpmkLJ7AoMq7OSKKEmXkrBcxqTDua_DERIYEIimeaaF_Ys2uZykm5E8VhPd9dSHzFIqBJ2NJYnk3fdRnkRLdV4aFWD1lyGUZtKBBgHKZXWmMlT3r5yMPqHi9axoyKgzFSFPgMUodJpafWbXbkMohC-CAxmOGgUUK9qJGba2Ma6Q3Crx5jOxXaSnU4utqB1WCnif-GN2L_c_w" 
            alt="User profile"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
};
