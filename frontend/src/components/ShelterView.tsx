import React from 'react';
import { Layers, Navigation, Umbrella, Share2, Navigation2, Footprints, Bookmark } from 'lucide-react';
import { motion } from 'motion/react';

export const ShelterView: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative h-[calc(100vh-160px)] overflow-hidden -mx-6"
    >
      {/* Interactive Map View */}
      <div className="absolute inset-0 map-mesh">
        {/* Simulated Map Elements */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 100 Q 250 50 400 200 T 800 150" fill="none" stroke="#005e53" strokeWidth="40" />
            <path d="M100 0 Q 150 250 50 400 T 200 800" fill="none" stroke="#005e53" strokeWidth="20" />
          </svg>
        </div>

        {/* User Location Marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-24 h-24 bg-primary/10 rounded-full animate-pulse"></div>
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-primary">
              <div className="w-4 h-4 bg-primary rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Shelter Markers */}
        <button className="absolute top-[45%] left-[60%] group">
          <div className="flex flex-col items-center">
            <div className="bg-primary text-white p-2 rounded-2xl shadow-xl transition-transform group-hover:scale-110 active:scale-90">
              <Umbrella size={24} fill="currentColor" />
            </div>
            <div className="mt-2 px-3 py-1 bg-surface-container-lowest rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold text-primary">MBS Shelter</span>
            </div>
          </div>
        </button>

        <button className="absolute top-[65%] left-[55%] group">
          <div className="bg-surface-container-lowest text-primary p-2 rounded-2xl shadow-md border-2 border-primary/20 hover:border-primary transition-all">
            <Umbrella size={24} />
          </div>
        </button>

        <button className="absolute top-[40%] left-[45%] group">
          <div className="bg-surface-container-lowest text-primary p-2 rounded-2xl shadow-md border-2 border-primary/20 hover:border-primary transition-all">
            <Umbrella size={24} />
          </div>
        </button>
      </div>

      {/* Floating Controls */}
      <div className="absolute right-6 top-6 flex flex-col gap-3">
        <button className="w-14 h-14 bg-surface-container-lowest text-on-surface rounded-2xl shadow-xl flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-95">
          <Layers size={24} />
        </button>
        <button className="w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95">
          <Navigation size={24} fill="currentColor" />
        </button>
      </div>

      {/* Bottom Sheet: Shelter Details */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="absolute bottom-6 left-4 right-4 z-40"
      >
        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,94,83,0.12)] border border-outline-variant/10">
          <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-6"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-black uppercase tracking-wider rounded-md">NParks</span>
                <span className="text-sm text-outline font-medium tracking-tight">Open 24/7</span>
              </div>
              <h2 className="text-2xl font-headline font-bold text-on-surface tracking-tight leading-tight">Marina Bay Sands Shelter</h2>
            </div>
            <button className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
              <Share2 size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-surface-container-low p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-container-lowest rounded-full flex items-center justify-center text-primary">
                <Navigation2 size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-outline tracking-widest">Distance</p>
                <p className="text-on-surface font-bold">350m</p>
              </div>
            </div>
            <div className="bg-surface-container-low p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-container-lowest rounded-full flex items-center justify-center text-primary">
                <Footprints size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-outline tracking-widest">Time</p>
                <p className="text-on-surface font-bold">5 mins</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 bg-primary text-on-primary py-4 rounded-full font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">
              <Navigation size={20} fill="currentColor" />
              Navigate Now
            </button>
            <button className="w-14 bg-surface-container-high text-on-surface-variant rounded-full flex items-center justify-center active:scale-95 transition-transform">
              <Bookmark size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
