import React, { useState } from 'react';
import { Search, Sparkles, Sunrise, Sun, AlertTriangle, Info, Thermometer } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../types';

export const TimeView: React.FC = () => {
  const [duration, setDuration] = useState(45);

  const windows = [
    { time: '6:00-7:00 AM', temp: 25, condition: 'Optimal Condition', score: 9, type: 'optimal', icon: Sunrise },
    { time: '7:00-8:00 AM', temp: 26, condition: 'Great for Endurance', score: 8, type: 'endurance', icon: Sun },
    { time: '11:00 AM-12:00 PM', temp: 31, condition: 'High UV Index', score: 4, type: 'warning', icon: AlertTriangle },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 pb-12"
    >
      {/* Hero Section */}
      <section className="space-y-4">
        <h1 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight leading-none">Optimal Window</h1>
        <p className="text-on-surface-variant text-lg">Plan your run around the Singapore heat and humidity for peak performance.</p>
      </section>

      {/* Duration Selection */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-3xl flex flex-col justify-between min-h-[220px] shadow-sm">
          <div>
            <span className="text-[10px] text-primary font-black uppercase tracking-widest">Run Duration</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-headline font-extrabold text-5xl text-primary">{duration}</span>
              <span className="font-bold text-on-surface-variant">MINS</span>
            </div>
          </div>
          <div className="w-full mt-6">
            <input 
              className="w-full h-2 bg-surface-container-high rounded-full appearance-none accent-primary" 
              max="120" min="15" step="5" type="range" 
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
            />
            <div className="flex justify-between mt-3 text-xs font-bold text-outline-variant uppercase">
              <span>15m</span>
              <span>120m</span>
            </div>
          </div>
        </div>
        
        <button className="bg-primary text-on-primary rounded-3xl p-8 flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:opacity-90 active:scale-95 shadow-lg shadow-primary/20 group">
          <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Search size={32} />
          </div>
          <span className="font-headline font-bold text-lg">Find best time</span>
        </button>
      </section>

      {/* Results List */}
      <section className="space-y-4">
        <h2 className="font-headline font-bold text-xl flex items-center gap-2">
          <Sparkles size={20} className="text-primary" />
          Suggested Windows
        </h2>
        
        <div className="space-y-3">
          {windows.map((window, idx) => {
            const Icon = window.icon;
            const isWarning = window.type === 'warning';
            
            return (
              <div 
                key={idx} 
                className={cn(
                  "bg-surface-container-lowest p-5 rounded-2xl flex items-center justify-between group hover:bg-surface-container-low transition-colors duration-300 shadow-sm",
                  isWarning && "border-l-4 border-error"
                )}
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center",
                    isWarning ? "bg-error-container" : "bg-secondary-container"
                  )}>
                    <Icon size={24} className={isWarning ? "text-error" : "text-on-secondary-container"} />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-lg leading-tight">{window.time}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={cn(
                        "flex items-center text-sm font-bold",
                        isWarning ? "text-error" : "text-on-surface-variant"
                      )}>
                        <Thermometer size={14} className="mr-1" /> {window.temp}°C
                      </span>
                      <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
                      <span className={cn(
                        "text-sm font-bold",
                        isWarning ? "text-on-surface-variant" : "text-on-secondary-container"
                      )}>
                        {window.condition}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "font-headline font-extrabold text-2xl flex items-center justify-end gap-1",
                    isWarning ? "text-error" : "text-secondary"
                  )}>
                    {window.score}<span className="text-sm font-bold text-outline-variant">/10</span>
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase tracking-widest font-black",
                    isWarning ? "text-error" : "text-secondary"
                  )}>
                    Safety Score
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Informational Card */}
      <section className="bg-surface-container-low p-6 rounded-3xl">
        <div className="flex gap-4">
          <div className="bg-surface-container-lowest p-3 rounded-full h-fit shadow-sm">
            <Info size={20} className="text-tertiary" />
          </div>
          <div>
            <h4 className="font-headline font-bold text-on-surface">Heat Safety Algorithm</h4>
            <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
              Safety scores are calculated based on humidity, UV radiation, and real-time shelter availability along your routes.
            </p>
          </div>
        </div>
      </section>
    </motion.div>
  );
};
