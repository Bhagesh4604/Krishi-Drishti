import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import {
  ArrowLeft,
  Search,
  Layers,
  MoreVertical,
  MapPin,
  Droplets,
  Thermometer,
  Wind,
  Activity,
  ScanLine,
  ChevronRight,
  Plus,
  Loader2,
  X
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { plotService, getUserLocation } from '../src/services/api';

// Fix Leaflet Icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
}

const RecenterMap = ({ lat, lng, trigger }: { lat: number, lng: number, trigger: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 18, { duration: 1.5 });
  }, [lat, lng, trigger]); // Trigger causes re-fly
  return null;
};

const FarmMapScreen: React.FC<FarmMapScreenProps> = ({ navigateTo }) => {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0); // Add trigger state
  const [loading, setLoading] = useState(true);

  // Analysis State
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  useEffect(() => {
    // 1. Get Location
    getUserLocation().then(loc => setLocation(loc));

    // 2. Load Plots
    fetchPlots();
  }, []);

  const fetchPlots = async () => {
    try {
      const data = await plotService.getPlots();
      setPlots(data);
      if (data.length > 0) setSelectedPlot(data[0]);
    } catch (e) {
      console.error("Failed to fetch plots", e);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!selectedPlot) return;
    setIsScanning(true);
    try {
      const [analysis, yieldRes] = await Promise.all([
        plotService.analyzePlot(selectedPlot.id),
        plotService.forecastYield(selectedPlot.id)
      ]);
      setAnalysisResult({ ...analysis, ...yieldRes });
      setShowAnalysisModal(true);
    } catch (e) {
      console.error("Scan failed", e);
      alert("Analysis failed. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const stats = React.useMemo(() => {
    if (!selectedPlot) return [];
    return [
      { label: 'Plant Health', value: `${(selectedPlot.health_score * 100).toFixed(0)}%`, color: 'text-green-500' },
      { label: 'Moisture', value: `${selectedPlot.moisture.toFixed(0)}%`, color: 'text-blue-500' },
      { label: 'Soil', value: `${Math.min(100, selectedPlot.health_score * 100 + 5).toFixed(0)}%`, color: 'text-amber-500' },
      { label: 'Pest Risk', value: selectedPlot.health_score < 0.6 ? 'High' : (selectedPlot.health_score < 0.8 ? 'Medium' : 'Low'), color: selectedPlot.health_score < 0.8 ? 'text-red-500' : 'text-green-500' },
    ]
  }, [selectedPlot]);

  const chartData = React.useMemo(() => {
    if (!selectedPlot) return [];
    const base = selectedPlot.health_score * 100;
    return Array.from({ length: 12 }, (_, i) => Math.min(100, Math.max(10, base + Math.sin(i + selectedPlot.id) * 20)));
  }, [selectedPlot]);

  return (
    <div className="h-full flex flex-col bg-gray-50 relative overflow-hidden font-sans">

      {/* 1. Header */}
      <div className="px-6 pt-12 pb-4 flex justify-between items-center bg-white shadow-sm z-20">
        <button className="p-2 bg-gray-100 rounded-full text-gray-600">
          <Search size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Your Field</h1>
        <button
          className="p-2 bg-black text-white rounded-full"
          onClick={() => navigateTo('landmark')} // Navigate to add plot
        >
          <Layers size={20} />
        </button>
      </div>

      {/* 2. Scrollable Content */}
      <div className="flex-1 overflow-y-auto relative no-scrollbar">

        {/* Top Field Cards Carousel */}
        <div className="mt-4 flex overflow-x-auto gap-4 px-6 pb-4 snap-x snap-mandatory no-scrollbar" style={{ scrollBehavior: 'smooth' }}>
          {plots.map((plot) => (
            <div
              key={plot.id}
              onClick={() => setSelectedPlot(plot)}
              className={`min-w-[85%] snap-center p-5 rounded-3xl shadow-sm border relative overflow-hidden transition-all duration-300 ${selectedPlot?.id === plot.id
                ? 'bg-white border-green-500 ring-2 ring-green-100 transform scale-[1.02]'
                : 'bg-white/80 border-gray-100 opacity-70 hover:opacity-100'
                }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{plot.name}</h2>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 font-bold uppercase">
                    <span className="flex items-center gap-1"><Activity size={12} /> 12 Task</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {plot.area || 12} ha</span>
                  </div>
                </div>
                {plot.health_score > 0.8 && (
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Good Condition
                  </div>
                )}
              </div>

              {/* Bar Chart Visualization */}
              <div className="h-16 flex items-end justify-between gap-1 mb-4">
                {chartData.map((h, i) => (
                  <div
                    key={i}
                    className={`w-full rounded-t-md ${i === chartData.length - 1 ? 'bg-gradient-to-t from-green-400 to-green-200' : 'bg-gray-100'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                <div className={`w-2 h-2 rounded-full animate-pulse ${plot.health_score > 0.8 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-gray-500">12 days until harvest</span>
              </div>

              {/* Side Action Button */}
              {selectedPlot?.id === plot.id && (
                <div className="absolute top-1/2 -translate-y-1/2 right-0 bg-black text-white py-6 px-1 rounded-l-2xl flex flex-col items-center justify-center gap-1 shadow-lg animate-in slide-in-from-right-4">
                  <ChevronRight size={16} color="white" />
                </div>
              )}
            </div>
          ))}

          {/* Add New Card Placeholder */}
          <button
            onClick={() => navigateTo('landmark')}
            className="min-w-[20%] flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-gray-300 text-gray-400 hover:text-green-600 hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <Plus size={24} />
            <span className="text-xs font-bold">Add Field</span>
          </button>
        </div>

        {/* 3. Map Section */}
        <div className="m-6 h-[400px] rounded-[40px] overflow-hidden shadow-xl border-4 border-white relative z-0">
          {location && (
            <MapContainer
              center={[location.lat, location.lng]}
              zoom={16}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
              <RecenterMap
                lat={selectedPlot?.coordinates[0]?.lat || location.lat}
                lng={selectedPlot?.coordinates[0]?.lng || location.lng}
                trigger={recenterTrigger}
              />

              {/* Render Plots */}
              {plots.map((plot, idx) => (
                <Polygon
                  key={plot.id}
                  positions={plot.coordinates}
                  pathOptions={{
                    color: idx === 0 ? '#60a5fa' : '#4ade80',  // Blue for first, Green for second (simulated)
                    fillColor: idx === 0 ? '#3b82f6' : '#22c55e',
                    fillOpacity: 0.2, // Transparent fill for pattern effect
                    weight: 2
                  }}
                  eventHandlers={{
                    click: () => setSelectedPlot(plot)
                  }}
                />
              ))}

              {/* Pattern Overlay (Simulated via CSS on top of map container? No, hard to align. 
                        Let's stick to simple polygons for now, pattern is complex in Leaflet without SVG ref)
                    */}
            </MapContainer>
          )}

          {/* Overlay Controls */}
          <div className="absolute top-4 left-4 z-[400]">
            <button
              className="w-10 h-10 bg-[#ccff00] rounded-full flex items-center justify-center shadow-lg text-black hover:scale-110 transition-transform active:scale-95"
              onClick={() => setRecenterTrigger(prev => prev + 1)}
            >
              <MapPin size={20} />
            </button>
          </div>

          {/* Bottom Field Stats Card (Overlay) */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/20 backdrop-blur-md border border-white/30 p-4 rounded-3xl text-white z-[400]">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-2xl font-bold">{selectedPlot?.name || 'Your Field'}</h3>
              </div>
              <span className="text-xs font-medium opacity-80">{selectedPlot?.area ? `${selectedPlot.area} Acres` : 'N/A'}</span>
            </div>

            <div className="grid grid-cols-2 gap-y-1 gap-x-8 text-xs font-medium">
              {stats.map((s, i) => (
                <div key={i} className="flex justify-between items-center py-0.5 border-b border-white/10 last:border-0">
                  <span className="opacity-80">{s.label}</span>
                  <span className="font-bold">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Floating Scan Button */}
      <button
        className={`absolute bottom-24 right-8 w-14 h-14 bg-[#ccff00] rounded-full flex items-center justify-center shadow-2xl z-50 text-black transition-transform ${isScanning ? 'scale-90 opacity-80' : 'animate-bounce-slow'}`}
        onClick={handleScan}
        disabled={isScanning || !selectedPlot}
      >
        {isScanning ? <Loader2 size={24} className="animate-spin" /> : <ScanLine size={24} />}
      </button>

      {/* Analysis Modal */}
      {showAnalysisModal && analysisResult && (
        <div className="absolute inset-0 z-[500] bg-black/50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
            <button
              onClick={() => setShowAnalysisModal(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Activity size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Analysis Report</h3>
                <p className="text-xs text-gray-500 font-bold">{selectedPlot?.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Yield Forecast */}
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-[10px] uppercase font-black text-blue-500 mb-1">Predicted Yield</p>
                <h4 className="text-2xl font-black text-blue-700">{analysisResult.predicted_yield_tons_per_ha} <span className="text-sm">Tons/ha</span></h4>
                <p className="text-xs text-blue-600 font-medium mt-1">Total: {analysisResult.total_estimated_yield_tons} Tons | Rev: ₹{analysisResult.estimated_revenue_inr?.toLocaleString()}</p>
              </div>

              {/* Alerts / ML Models */}
              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">System Alerts</h4>
                <div className="space-y-2">
                  {analysisResult.alerts?.map((alert: string, idx: number) => (
                    <div key={idx} className={`p-3 rounded-xl border text-sm font-bold flex items-start gap-2 ${alert.includes('ANOMALY') || alert.includes('🔴') ? 'bg-red-50 text-red-700 border-red-100' :
                      alert.includes('🟠') ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        'bg-gray-50 text-gray-700 border-gray-100'
                      }`}>
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl flex justify-between">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 uppercase font-black">Health Score</p>
                  <p className="text-lg font-black text-gray-700">{(analysisResult.ndvi_avg * 100).toFixed(0)}%</p>
                </div>
                <div className="border-r border-gray-200" />
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 uppercase font-black">Moisture</p>
                  <p className="text-lg font-black text-gray-700">{(analysisResult.soil_moisture).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FarmMapScreen;
