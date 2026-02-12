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
  Plus
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { plotService } from '../src/services/api';

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

  useEffect(() => {
    // 1. Get Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => setLocation({ lat: 21.1458, lng: 79.0882 }) // Nagpur default
      );
    } else {
      setLocation({ lat: 21.1458, lng: 79.0882 });
    }

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

  // Mock Data for UI (to match image)
  const stats = [
    { label: 'Plant Health', value: '98%', color: 'text-green-500' },
    { label: 'Water Depth', value: '72%', color: 'text-blue-500' },
    { label: 'Soil', value: '80%', color: 'text-amber-500' },
    { label: 'Pest', value: '2%', color: 'text-red-500' },
  ];

  const chartData = [40, 60, 45, 70, 30, 50, 65, 80, 55, 60, 75, 40]; // Mock bar values

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
                <h3 className="text-2xl font-bold">18 kg/h</h3>
              </div>
              <span className="text-xs font-medium opacity-80">{selectedPlot?.area || 12} ha</span>
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
        className="absolute bottom-24 right-8 w-14 h-14 bg-[#ccff00] rounded-full flex items-center justify-center shadow-2xl z-50 text-black animate-bounce-slow"
        onClick={() => {
          // Trigger Scan/Analysis
          if (selectedPlot) {
            // ... trigger analysis ...
          }
        }}
      >
        <ScanLine size={24} />
      </button>

    </div>
  );
};

export default FarmMapScreen;
