import React from 'react';
import { UserButton } from '@clerk/react';
import { MapPin, Bell, Search, CloudRain } from 'lucide-react';
import { cn, type Tab } from '../types';

interface TopBarProps {
  activeTab: Tab;
  location?: string;
  rainWarning?: boolean;
  authEnabled?: boolean;
  isAuthenticated?: boolean;
  userLabel?: string | null;
  onLogin?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  location = "Marina Bay",
  rainWarning,
  authEnabled = false,
  isAuthenticated = false,
  userLabel,
  onLogin,
}) => {
  const authButtonLabel = isAuthenticated ? "Account" : "Log in";

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

        {authEnabled && isAuthenticated ? (
          <div
            className="rounded-full border border-outline-variant/20 bg-surface-container-high p-1"
            title={userLabel ? `Signed in as ${userLabel}` : "Account"}
          >
            <UserButton />
          </div>
        ) : authEnabled ? (
          <button
            className="rounded-full border border-outline-variant/20 bg-surface-container-high px-4 py-2 text-xs font-bold text-primary transition-opacity hover:opacity-80 active:scale-95"
            onClick={onLogin}
            title={authButtonLabel}
            type="button"
          >
            {authButtonLabel}
          </button>
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant/20">
            <span className="text-xs font-bold text-primary">RR</span>
          </div>
        )}
      </div>
    </header>
  );
};
