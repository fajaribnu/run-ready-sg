import { Bolt, CheckCircle2, Thermometer, Droplets, Umbrella, Map as MapIcon, Clock, ChevronRight, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';
export const HomeView: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      {/* Hero Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface leading-none">
            Ready for your <span className="text-primary">daily run?</span>
          </h1>
          <p className="text-on-surface-variant text-lg">Check the heat index before you head out.</p>
        </div>
        
        <button className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary h-16 rounded-full font-bold text-lg shadow-[0_12px_40px_rgba(0,94,83,0.15)] flex items-center justify-center gap-2 active:scale-95 transition-all duration-200">
          <span>Can I run now?</span>
          <Bolt size={20} fill="currentColor" />
        </button>
      </section>

      {/* Status Result Card */}
      <section className="relative">
        <div className="bg-secondary-container p-8 rounded-xl flex flex-col items-center text-center space-y-4 overflow-hidden relative">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-on-secondary-container/5 rounded-full blur-3xl"></div>
          <div className="bg-on-secondary-container/10 p-4 rounded-full">
            <CheckCircle2 size={48} className="text-on-secondary-container" fill="currentColor" />
          </div>
          <div className="space-y-1">
            <h2 className="text-5xl font-extrabold tracking-tighter text-on-secondary-container uppercase">SAFE</h2>
            <p className="text-on-secondary-container font-medium text-lg leading-snug">Low WBGT, perfect for exercise!</p>
          </div>
          <div className="pt-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-secondary-container/60">Updated 2 mins ago</span>
          </div>
        </div>
      </section>

      {/* Weather Bento Grid */}
      <section className="grid grid-cols-2 gap-4">
        <div className="col-span-2 bg-surface-container-lowest p-6 rounded-2xl flex justify-between items-center shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="space-y-1">
            <span className="text-on-surface-variant font-medium text-sm flex items-center gap-1 uppercase tracking-wider">
              <Thermometer size={16} /> WBGT
            </span>
            <h3 className="text-4xl font-bold text-on-surface">24<span className="text-xl font-medium">°C</span></h3>
          </div>
          <div className="h-12 w-1.5 bg-secondary-container rounded-full"></div>
          <p className="text-on-surface-variant text-sm max-w-[120px] text-right font-medium">Safe range for all activities.</p>
        </div>

        <div className="bg-surface-container-low p-6 rounded-2xl space-y-2">
          <Thermometer size={24} className="text-primary" />
          <div>
            <span className="block text-on-surface-variant text-xs font-bold uppercase tracking-wider">Temp</span>
            <span className="text-2xl font-bold text-on-surface">28°C</span>
          </div>
        </div>

        <div className="bg-surface-container-low p-6 rounded-2xl space-y-2">
          <Droplets size={24} className="text-primary-container" />
          <div>
            <span className="block text-on-surface-variant text-xs font-bold uppercase tracking-wider">Rain</span>
            <span className="text-2xl font-bold text-on-surface">0%</span>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Quick Actions</h3>
        <div className="flex flex-col gap-3">
          {[
            { label: 'Find Shelter', icon: Umbrella },
            { label: 'Plan Route', icon: MapIcon },
            { label: 'Best Time', icon: Clock },
          ].map((action) => (
            <div key={action.label} className="flex items-center justify-between bg-surface-container-lowest p-5 rounded-2xl hover:bg-surface-container-high transition-colors cursor-pointer group shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <action.icon size={20} />
                </div>
                <span className="font-bold text-on-surface">{action.label}</span>
              </div>
              <ChevronRight size={20} className="text-outline-variant" />
            </div>
          ))}
        </div>
      </section>

      {/* Map Snippet */}
      <section>
        <div className="rounded-3xl overflow-hidden h-48 relative shadow-lg">
          <img 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkb5rXPKXx9mIThYkP45iUaj5bzfiTegtdlDz3pGqt50aBUhBBjEVrwaf8ufikebeF8wrP3h46l7Mgs1YAA8nS3qHC7nPYjQdVIABLOFS3dThRWRO2WE6Lf9rENrYNB1gF3oxOBe8PfaRD51LVB7KyciHTAV6bIsa2PLw0TpV8g_lf0zU6a5g8QZBk07xRL-iXCwmhnTGFxf6HvrCs56D-L2GvCfjFzfo7pIO8h1k17iL6HJ690aQr6BSfKxgRMj-zs1T5qe6utgo" 
            alt="Marina Bay Loop"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl">
              <p className="text-[10px] font-bold uppercase text-primary leading-none">Suggested Track</p>
              <p className="text-sm font-bold text-on-surface">Gardens by the Bay Loop</p>
            </div>
            <div className="bg-primary text-white p-2 rounded-full shadow-lg">
              <ArrowRight size={20} />
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};
