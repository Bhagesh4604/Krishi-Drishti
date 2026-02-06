
import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { ArrowLeft, Info, Layers, Maximize, Navigation, Zap, MapPin, Loader2, RefreshCw } from 'lucide-react';
import { COLORS } from '../constants';

interface FarmMapScreenProps {
  navigateTo: (screen: Screen) => void;
}

const FarmMapScreen: React.FC<FarmMapScreenProps> = ({ navigateTo }) => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [viewMode, setViewMode] = useState<'satellite' | 'ndvi'>('ndvi');

  useEffect(() => {
    // Attempt to get user's real location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          // Simulate data fetching delay
          setTimeout(() => setIsScanning(false), 2000);
        },
        (error) => {
          console.error("Error getting location:", error);
          // Fallback to a default location (e.g., Nagpur)
          setLocation({ lat: 21.1458, lng: 79.0882 });
          setTimeout(() => setIsScanning(false), 2000);
        }
      );
    }
  }, []);

  const handleRescan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 1500);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 overflow-hidden">
      {/* Map Header */}
      <div className="p-4 bg-white flex justify-between items-center shadow-md z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateTo('home')} className="text-gray-600 p-1">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">Plot Monitoring</h2>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Live Satellite Feed</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setViewMode(viewMode === 'satellite' ? 'ndvi' : 'satellite')}
          className={`px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm ${
            viewMode === 'ndvi' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {viewMode === 'ndvi' ? <Zap size={12} fill="white" /> : <Layers size={12} />}
          {viewMode === 'ndvi' ? 'NDVI Active' : 'Satellite'}
        </button>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative bg-[#1a1a1a]">
        {/* Dynamic Satellite Background */}
        <div className="absolute inset-0 transition-opacity duration-1000">
           <img 
            src={`https://picsum.photos/seed/${location?.lat || 'farm'}/1200/1200`} 
            className="w-full h-full object-cover opacity-50 grayscale contrast-125"
            alt="Satellite Feed"
          />
          
          {/* NDVI Layer Overlay */}
          <div className={`absolute inset-0 transition-opacity duration-700 ${viewMode === 'ndvi' ? 'opacity-70' : 'opacity-0'}`}>
            <svg className="w-full h-full">
              <defs>
                <filter id="ndviBlur">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="25" />
                </filter>
              </defs>
              <g filter="url(#ndviBlur)">
                <circle cx="40%" cy="35%" r="120" fill="#22c55e" />
                <circle cx="75%" cy="25%" r="140" fill="#166534" />
                <circle cx="60%" cy="65%" r="100" fill="#15803d" />
                <circle cx="45%" cy="85%" r="80" fill="#ef4444" />
                <circle cx="85%" cy="75%" r="70" fill="#facc15" />
              </g>
            </svg>
          </div>

          {/* Boundaries and Markers */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path 
              d="M 80 150 L 320 120 L 380 450 L 120 480 Z" 
              fill="rgba(255, 255, 255, 0.05)" 
              stroke="white" 
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          </svg>

          {/* Interactive Marker for Stress Area */}
          <div className="absolute top-[80%] left-[45%] -translate-x-1/2 -translate-y-1/2 group">
            <div className="w-6 h-6 bg-red-500 rounded-full animate-ping absolute inset-0"></div>
            <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center relative shadow-lg">
               <Info size={12} className="text-white" />
            </div>
          </div>
        </div>

        {/* Scan Animation */}
        {isScanning && (
          <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
            <div className="relative mb-6">
              <Loader2 className="animate-spin text-green-500" size={64} />
              <Navigation className="absolute inset-0 m-auto text-white animate-pulse" size={24} />
            </div>
            <h3 className="text-xl font-bold tracking-tight">Syncing Satellite Data</h3>
            <p className="text-sm text-gray-400 mt-2 font-medium">Fetching 10m resolution spectral bands...</p>
            <div className="mt-8 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-green-500 w-1/2 animate-[load_2s_ease-in-out_infinite]"></div>
            </div>
          </div>
        )}

        {/* Map UI Controls */}
        <div className="absolute right-4 top-4 flex flex-col gap-3">
          <MapButton icon={<Maximize size={20} />} />
          <MapButton icon={<Navigation size={20} />} onClick={handleRescan} />
          <div className="mt-auto bg-black/60 backdrop-blur-md rounded-2xl p-2 flex flex-col items-center gap-2 border border-white/10">
            <div className="w-6 h-6 rounded-lg bg-green-500 border border-white/20"></div>
            <div className="w-6 h-6 rounded-lg bg-yellow-400 border border-white/20"></div>
            <div className="w-6 h-6 rounded-lg bg-red-500 border border-white/20"></div>
          </div>
        </div>

        {/* Bottom Panel */}
        <div className="absolute bottom-6 left-6 right-6 bg-white rounded-3xl p-5 shadow-2xl border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Current Health Index</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Coordinates: {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-green-600">0.78</p>
              <p className="text-[10px] font-bold text-gray-400">Avg NDVI</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-2xl border border-red-100">
               <AlertIcon />
               <div className="flex-1">
                 <p className="text-xs font-bold text-red-900">Pest Alert Spotted</p>
                 <p className="text-[10px] text-red-700">Abnormal stress detected in Plot Sector 4-B</p>
               </div>
               <button 
                onClick={() => navigateTo('vision')}
                className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-[10px] font-bold"
               >
                Scan Now
               </button>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button className="flex-1 py-3 bg-gray-900 text-white rounded-2xl text-xs font-bold transition-all active:scale-95">Download PDF Report</button>
            <button className="flex-1 py-3 bg-green-50 text-green-700 border border-green-200 rounded-2xl text-xs font-bold active:scale-95" onClick={handleRescan}>
              <RefreshCw size={14} className="inline mr-2" /> Refresh
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes load {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

const MapButton: React.FC<{ icon: React.ReactNode; onClick?: () => void }> = ({ icon, onClick }) => (
  <button 
    onClick={onClick}
    className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-gray-600 active:scale-90 transition-transform border border-gray-100"
  >
    {icon}
  </button>
);

const AlertIcon = () => (
  <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-200">
    <MapPin size={16} />
  </div>
);

export default FarmMapScreen;
