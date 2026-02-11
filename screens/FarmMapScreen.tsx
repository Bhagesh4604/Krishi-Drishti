
import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { ArrowLeft, Info, Layers, Maximize, Navigation, Zap, MapPin, Loader2, RefreshCw, Plus, Trash2, Globe, Search, ChevronRight } from 'lucide-react';
import { COLORS } from '../constants';
import { plotService, weatherService } from '../src/services/api';
// @ts-ignore
import GlobeView from './GlobeView';

interface FarmMapScreenProps {
  navigateTo: (screen: Screen) => void;
}

interface Plot {
  id: number;
  name: string;
  coordinates: { lat: number, lng: number }[];
  area: number;
  crop_type?: string;
  health_score: number;
  moisture: number;
  image_url?: string;
  last_scan_date?: string;
}

const FarmMapScreen: React.FC<FarmMapScreenProps> = ({ navigateTo }) => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [viewMode, setViewMode] = useState<'satellite' | 'ndvi'>('ndvi');
  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [isAddingPlot, setIsAddingPlot] = useState(false);
  const [newPlotName, setNewPlotName] = useState('');
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [showGlobe, setShowGlobe] = useState(false);

  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);

  // Initialize
  useEffect(() => {
    // 1. Try GPS
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn("GPS failed, defaulting to Nagpur", error);
          setLocation({ lat: 21.1458, lng: 79.0882 }); // Default
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setLocation({ lat: 21.1458, lng: 79.0882 });
    }

    // 2. Load Plots
    fetchPlots();
  }, []);

  const fetchPlots = async () => {
    setLoadingPlots(true);
    try {
      const data = await plotService.getPlots();
      setPlots(data);
      if (data.length > 0 && !selectedPlot) {
        setSelectedPlot(data[0]);
      }
    } catch (e) {
      console.error("Failed to load plots", e);
    } finally {
      setLoadingPlots(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchingCity(true);
    try {
      const results = await weatherService.searchCity(searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    } finally {
      setSearchingCity(false);
    }
  };

  const selectLocation = (city: any) => {
    const newLoc = { lat: city.latitude, lng: city.longitude };
    setLocation(newLoc);
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);

    // If adding plot, we might want to confirm this is the location
    // But for now, just moving the map center is enough visual feedback
  };

  const handleAddPlot = async () => {
    if (!newPlotName.trim()) {
      alert("Please enter a name for your plot.");
      return;
    }
    if (!location) {
      alert("No location detected. Please search for your city/village first.");
      return;
    }

    // Create a 1-acre box around center
    const offset = 0.001;
    const newCoords = [
      { lat: location.lat + offset, lng: location.lng - offset },
      { lat: location.lat + offset, lng: location.lng + offset },
      { lat: location.lat - offset, lng: location.lng + offset },
      { lat: location.lat - offset, lng: location.lng - offset },
    ];

    try {
      await plotService.createPlot({
        name: newPlotName,
        coordinates: newCoords,
        area: 1.0,
        crop_type: "Mixed"
      });
      setIsAddingPlot(false);
      setNewPlotName('');
      fetchPlots();
    } catch (e) {
      console.error("Failed to create plot", e);
      alert("Failed to save plot. Please try again.");
    }
  };

  const handleRescan = async () => {
    if (!selectedPlot) return;
    setIsScanning(true);
    try {
      // Calls updated backend that uses Google Earth Engine
      await plotService.analyzePlot(selectedPlot.id);
      setTimeout(() => {
        setIsScanning(false);
        fetchPlots();
      }, 3000);
    } catch (e) {
      setIsScanning(false);
      alert("Analysis failed. Check your connection.");
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 overflow-hidden relative">
      {/* 3D Globe Overlay */}
      {showGlobe && (
        <GlobeView
          userLocation={location}
          plots={plots}
          onClose={() => setShowGlobe(false)}
        />
      )}

      {/* Header & Search */}
      <div className="p-4 bg-white flex justify-between items-center shadow-md z-30 relative">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => navigateTo('home')} className="text-gray-600 p-1 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={24} />
          </button>

          {isSearching ? (
            <div className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-left-4 mr-2">
              <div className="relative flex-1">
                <input
                  autoFocus
                  className="w-full bg-gray-100 rounded-xl pl-3 pr-10 py-2 text-sm font-bold outline-none border border-transparent focus:border-green-500 focus:bg-white transition-all"
                  placeholder="Search Village/City..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 p-1 hover:text-green-600"
                >
                  {searchingCity ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
              </div>
              <button onClick={() => { setIsSearching(false); setSearchResults([]); }} className="p-2 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200">
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Plot Monitoring</h2>
              <button
                onClick={() => setIsSearching(true)}
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 px-2 py-0.5 -ml-2 rounded-lg transition-colors mt-0.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  {location ? `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}` : "Locating..."} <Search size={10} />
                </p>
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons (Right) */}
        {!isSearching && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsSearching(true)}
              className="p-2 bg-gray-50 text-gray-600 rounded-xl border border-gray-100 hover:bg-gray-100"
            >
              <Search size={20} />
            </button>
            <button
              onClick={() => setShowGlobe(true)}
              className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-sm hover:bg-blue-100"
            >
              <Globe size={20} />
            </button>
            <button
              onClick={() => setIsAddingPlot(true)}
              className="p-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 border border-green-100"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'satellite' ? 'ndvi' : 'satellite')}
              className={`px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm ${viewMode === 'ndvi' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
            >
              {viewMode === 'ndvi' ? <Zap size={12} fill="white" /> : <Layers size={12} />}
              {viewMode === 'ndvi' ? 'NDVI' : 'Sat'}
            </button>
          </div>
        )}
      </div>

      {/* Search Dropdown Results */}
      {isSearching && searchResults.length > 0 && (
        <div className="absolute top-[70px] left-4 right-4 bg-white rounded-xl shadow-2xl z-50 border border-gray-100 max-h-60 overflow-y-auto">
          {searchResults.map((city) => (
            <button
              key={city.id}
              onClick={() => selectLocation(city)}
              className="w-full text-left p-4 hover:bg-green-50 text-sm font-bold border-b border-gray-50 last:border-0 flex justify-between items-center group"
            >
              <div>
                <span className="text-gray-900">{city.name}</span>
                <span className="text-gray-400 ml-2 text-xs font-normal">{city.country}</span>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-green-600" />
            </button>
          ))}
        </div>
      )}

      {/* Main Map Area */}
      <div className="flex-1 relative bg-[#1a1a1a]">

        {/* Background Layer */}
        <div className="absolute inset-0 transition-opacity duration-1000">
          {/* If we have a selected plot with an image, show it. Else fallback to map/placeholder */}
          <img
            // @ts-ignore
            src={selectedPlot?.image_url || `https://picsum.photos/seed/${selectedPlot?.id || 'farm'}/1200/1200`}
            className="w-full h-full object-cover opacity-60 grayscale contrast-125"
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
                <circle cx="40%" cy="35%" r="120" fill={selectedPlot?.health_score && selectedPlot.health_score > 0.8 ? "#22c55e" : "#eab308"} />
                <circle cx="60%" cy="65%" r="100" fill={selectedPlot?.health_score && selectedPlot.health_score > 0.8 ? "#15803d" : "#ef4444"} />
              </g>
            </svg>
          </div>

          {/* Current Location Marker (Center of Screen when no plot selected) */}
          {!selectedPlot && location && (
            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <MapPin size={48} className="text-red-500 drop-shadow-lg -mb-1" fill="white" />
              <div className="bg-white px-2 py-1 rounded-lg text-[10px] font-bold shadow-md">Center</div>
            </div>
          )}

          {/* Plot Marker */}
          {selectedPlot && (
            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 group">
              <div className="w-8 h-8 bg-green-500/20 rounded-full animate-ping absolute inset-0"></div>
              <div className="w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center relative shadow-lg">
                <MapPin size={16} className="text-white" />
              </div>
              <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {selectedPlot.name}
              </div>
            </div>
          )}
        </div>

        {/* Scan Animation */}
        {isScanning && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
            <div className="relative mb-6">
              <Loader2 className="animate-spin text-green-500" size={64} />
              <Navigation className="absolute inset-0 m-auto text-white animate-pulse" size={24} />
            </div>
            <h3 className="text-xl font-bold tracking-tight">Analyzing Satellite Data</h3>
            <p className="text-sm text-gray-400 mt-2 font-medium">Fetching Sentinel-2 NDVI & Soil Moisture...</p>
          </div>
        )}

        {/* Side Plot List */}
        {!isAddingPlot && plots.length > 0 && (
          <div className="absolute top-4 left-4 z-10 w-48 max-h-64 overflow-y-auto no-scrollbar space-y-2 pb-20">
            {plots.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlot(p)}
                className={`w-full p-3 rounded-xl text-left border shadow-lg backdrop-blur-md transition-all ${selectedPlot?.id === p.id
                  ? 'bg-green-600 border-green-500 text-white'
                  : 'bg-white/90 border-white/20 text-gray-900'
                  }`}
              >
                <p className="text-xs font-black truncate">{p.name}</p>
                <p className={`text-[9px] font-bold uppercase ${selectedPlot?.id === p.id ? 'text-green-200' : 'text-gray-500'}`}>
                  Health: {Math.round(p.health_score * 100)}%
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Add Plot Overlay Modal */}
        {isAddingPlot && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-gray-900">Add New Plot</h3>
                <button onClick={() => setIsAddingPlot(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200">
                  <Trash2 size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Plot Name</label>
                  <input
                    autoFocus
                    value={newPlotName}
                    onChange={(e) => setNewPlotName(e.target.value)}
                    placeholder="e.g. Rice Field North"
                    className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none border-2 border-transparent focus:border-green-500 focus:bg-white transition-all mt-1"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-blue-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-bold text-blue-900">Location Set</p>
                      <p className="text-[10px] text-blue-700 mt-0.5 leading-relaxed">
                        We will create the plot at your currently selected location: <br />
                        <span className="font-mono bg-blue-100 px-1 rounded">
                          {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "Unknown"}
                        </span>
                      </p>
                      {!location && (
                        <button onClick={() => { setIsAddingPlot(false); setIsSearching(true); }} className="mt-2 text-[10px] font-bold text-white bg-blue-600 px-2 py-1 rounded-lg">
                          Search Location First
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddPlot}
                  disabled={!location}
                  className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm & Save Plot
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Details Panel */}
        {selectedPlot && !isAddingPlot && (
          <div className="absolute bottom-6 left-6 right-6 bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 z-10">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900">{selectedPlot.name}</h4>
                <div className="flex flex-col">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Moisture: {Math.round(selectedPlot.moisture)}% • {selectedPlot.crop_type || 'Mixed'}
                  </p>
                  {/* @ts-ignore */}
                  {selectedPlot.last_scan_date && (
                    <p className="text-[9px] text-green-600 font-bold mt-0.5">
                      {/* @ts-ignore */}
                      Verified: {new Date(selectedPlot.last_scan_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black ${selectedPlot.health_score > 0.8 ? 'text-green-600' : selectedPlot.health_score > 0.5 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {selectedPlot.health_score.toFixed(2)}
                </p>
                <p className="text-[10px] font-bold text-gray-400">NDVI Score</p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedPlot.health_score < 0.8 && (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-2xl border border-red-100">
                  <AlertIcon />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-red-900">Stress Detected</p>
                    <p className="text-[10px] text-red-700">Low chlorophyll levels in sector A</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button className="flex-1 py-3 bg-gray-900 text-white rounded-2xl text-xs font-bold transition-all active:scale-95">
                Download Report
              </button>
              <button
                className="flex-1 py-3 bg-green-50 text-green-700 border border-green-200 rounded-2xl text-xs font-bold active:scale-95 flex items-center justify-center gap-2"
                onClick={handleRescan}
              >
                <RefreshCw size={14} /> Refresh Analysis
              </button>
            </div>
          </div>
        )}

        {!selectedPlot && !isAddingPlot && (
          <div className="absolute bottom-6 left-6 right-6 bg-white rounded-3xl p-5 shadow-2xl flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-900 font-bold">No plot selected</p>
            <p className="text-xs text-gray-400 mt-1">Select a plot from the list or add a new one.</p>
            {plots.length === 0 && (
              <button onClick={() => setIsAddingPlot(true)} className="mt-3 text-xs bg-green-600 text-white px-4 py-2 rounded-xl font-bold">
                Create First Plot
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AlertIcon = () => (
  <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-200">
    <MapPin size={16} />
  </div>
);

export default FarmMapScreen;
