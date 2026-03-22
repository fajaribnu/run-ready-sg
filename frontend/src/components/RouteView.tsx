import React, { useState } from 'react';
import { Sparkles, CloudRain } from 'lucide-react';
import { motion } from 'motion/react';

export const RouteView: React.FC = () => {
  const [distance, setDistance] = useState(5);
  const [isLoop, setIsLoop] = useState(true);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 pb-12"
    >
      {/* Hero Map Section */}
      <section className="relative h-[400px] w-full overflow-hidden rounded-3xl shadow-inner bg-surface-container-high">
        <img 
          alt="Map background" 
          className="w-full h-full object-cover opacity-60" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuASe8AVKENJpL3mvzkhZ55STVsw0C-Sp3qzYiB_BLOWjCJfJiY2ZvWAylDLAPwADNsDs_ZQVsH8wyNWyGPBE9ESG3GJJmZBZFbNYcxaT7LzCom7ErZ__xw6fy4ouBZxYS1CLaI76E8Ng_L4vtF1m6A81xwsH1S4F1vo1RWMWyRPlQ2ATN3ST3a69wSk4faIHxigv1Jjk14-uEN6W0lTWvC-vwv_fRNH88oSOQ2OXZ0qxrMkPnQv5tlyV0pGmAMGz9bcRjyAm6m998w" 
          referrerPolicy="no-referrer"
        />
        {/* SVG Route Overlay */}
        <svg className="absolute inset-0 w-full h-full drop-shadow-xl" viewBox="0 0 400 400">
          <path 
            className="stroke-outline-variant stroke-[6] fill-none stroke-linecap-round" 
            strokeDasharray="8 12"
            d="M 50 200 C 50 100, 150 50, 200 50 S 350 100, 350 200" 
          />
          <path 
            className="stroke-primary stroke-[6] fill-none stroke-linecap-round" 
            d="M 350 200 C 350 300, 250 350, 200 350 S 50 300, 50 200" 
          />
          <circle cx="50" cy="200" fill="#005e53" r="8" stroke="white" strokeWidth="2" />
          <circle cx="350" cy="200" fill="#7b4700" r="8" stroke="white" strokeWidth="2" />
        </svg>

        {/* Floating Legend */}
        <div className="absolute top-6 left-6 flex flex-col gap-2">
          <div className="bg-surface-container-lowest/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Sheltered Route</span>
          </div>
          <div className="bg-surface-container-lowest/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
            <div className="w-3 h-3 rounded-full bg-outline-variant"></div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Exposed Route</span>
          </div>
        </div>
      </section>

      {/* Planning Controls Panel */}
      <section className="space-y-6">
        {/* Bento Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Distance', value: '5.2', unit: 'km' },
            { label: 'Duration', value: '30', unit: 'm' },
            { label: 'Shelter', value: '70', unit: '%', color: 'text-on-secondary-container' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
              <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-1">{stat.label}</span>
              <span className={`text-3xl font-headline font-extrabold ${stat.color || 'text-primary'} tracking-tight`}>
                {stat.value}<span className="text-sm font-medium">{stat.unit}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Main Control Card */}
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-outline-variant/10">
          <div className="space-y-8">
            {/* Distance Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="font-headline font-bold text-lg">Target Distance</label>
                <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-sm font-bold">
                  {distance.toFixed(1)} km
                </span>
              </div>
              <input 
                className="w-full h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary" 
                max="20" min="1" step="0.5" type="range" 
                value={distance}
                onChange={(e) => setDistance(parseFloat(e.target.value))}
              />
              <div className="flex justify-between text-[10px] font-bold text-outline-variant uppercase tracking-tighter">
                <span>1km</span>
                <span>5km</span>
                <span>10km</span>
                <span>15km</span>
                <span>20km+</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
              {/* Toggle Loop */}
              <div className="flex items-center gap-4 w-full md:w-auto">
                <span className="font-headline font-bold text-lg">Loop Route</span>
                <button 
                  onClick={() => setIsLoop(!isLoop)}
                  className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors duration-300 focus:outline-none ${isLoop ? 'bg-primary' : 'bg-surface-container-high'}`}
                >
                  <span className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform duration-300 ${isLoop ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
                <span className="font-bold text-on-surface">{isLoop ? 'ON' : 'OFF'}</span>
              </div>

              {/* Generate Button */}
              <button className="w-full md:w-auto bg-primary text-on-primary px-10 py-5 rounded-full font-headline font-extrabold text-lg flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20">
                <Sparkles size={20} />
                Generate route
              </button>
            </div>
          </div>
        </div>

        {/* Weather/Surface Insight */}
        <div className="bg-secondary-container/30 p-6 rounded-2xl border border-secondary-container flex items-start gap-4">
          <CloudRain size={32} className="text-on-secondary-container" />
          <div>
            <h4 className="font-headline font-bold text-on-secondary-container">Weather Advisory</h4>
            <p className="text-sm text-on-secondary-container/80 leading-relaxed">
              Intermittent rain expected in 15 mins. Your generated route utilizes overhead linkways for 70% of the duration to keep you dry.
            </p>
          </div>
        </div>
      </section>
    </motion.div>
  );
};
