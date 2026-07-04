import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import {
  ArrowLeft, Search, Layers, MoreVertical,
  MapPin, Droplets, Thermometer, Wind,
  Activity, ScanLine, ChevronRight, Plus,
  Loader2, X, Satellite, AlertTriangle
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { plotService } from '../src/services/api';
import useGeolocation from '../src/hooks/useGeolocation';

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
  }, [lat, lng, trigger]);
  return null;
};

const FarmMapScreen: React.FC<FarmMapScreenProps> = ({ navigateTo }) => {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  // Analysis State
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  const { getCurrentLocation } = useGeolocation();

  useEffect(() => {
    getCurrentLocation().then(pos => {
      if (pos) setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
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
        plotService.startAnalysis(selectedPlot.id),
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
      { label: 'Plant Health', value: `${((selectedPlot.health_score || 0) * 100).toFixed(0)}%` },
      { label: 'Moisture', value: `${(selectedPlot.moisture || 0).toFixed(0)}%` },
      { label: 'Soil Quality', value: `${Math.min(100, (selectedPlot.health_score || 0) * 100 + 5).toFixed(0)}%` },
      { label: 'Pest Risk', value: (selectedPlot.health_score || 0) < 0.6 ? 'High' : ((selectedPlot.health_score || 0) < 0.8 ? 'Medium' : 'Low') },
    ];
  }, [selectedPlot]);

  const chartData = React.useMemo(() => {
    if (!selectedPlot) return [];
    const base = selectedPlot.health_score * 100;
    return Array.from({ length: 12 }, (_, i) => Math.min(100, Math.max(10, base + Math.sin(i + selectedPlot.id) * 20)));
  }, [selectedPlot]);

  return (
    <div className="h-full flex flex-col relative overflow-hidden font-sans" style={{ background: '#F7F9F8', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. Header */}
      <div className="px-5 pt-12 pb-4 flex justify-between items-center bg-white sticky top-0 z-20" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <button className="p-2 bg-gray-50 rounded-full border border-gray-200 text-gray-600">
          <Search size={16} style={{ color: '#001A11' }} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold" style={{ color: '#001A11' }}>Your Fields</h1>
          <p className="text-[11px] font-semibold" style={{ color: '#00BB78' }}>Farm Management</p>
        </div>
        <button
          className="p-2 rounded-full text-white shadow-md active:scale-95 transition-transform"
          style={{ background: '#00BB78' }}
          onClick={() => navigateTo('landmark')}
        >
          <Layers size={16} />
        </button>
      </div>

      {/* 2. Scrollable Content */}
      <div className="flex-1 overflow-y-auto relative no-scrollbar pb-24">
        
        {/* Top Field Cards Carousel */}
        <div className="mt-4 flex overflow-x-auto gap-4 px-5 pb-4 snap-x snap-mandatory no-scrollbar" style={{ scrollBehavior: 'smooth' }}>
          {plots.map((plot) => (
            <div
              key={plot.id}
              onClick={() => setSelectedPlot(plot)}
              className="min-w-[85%] snap-center p-5 rounded-3xl transition-all duration-300 relative bg-white"
              style={{
                border: selectedPlot?.id === plot.id ? '1.5px solid #00BB78' : '1px solid #F0F0F0',
                boxShadow: selectedPlot?.id === plot.id ? '0 4px 12px rgba(0,187,120,0.1)' : '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-base font-bold" style={{ color: '#001A11' }}>{plot.name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-[11px] font-bold" style={{ color: '#616B68' }}>
                    <span className="flex items-center gap-1"><Activity size={12} /> 12 Tasks</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {plot.area || 12} ha</span>
                  </div>
                </div>
                {plot.health_score > 0.8 && (
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider" style={{ background: '#E8FBF3', color: '#00BB78' }}>
                    Good
                  </span>
                )}
              </div>

              {/* Bar Chart Visualization */}
              <div className="h-12 flex items-end justify-between gap-1 mb-4">
                {chartData.map((h, i) => (
                  <div
                    key={i}
                    className="w-full rounded-t-sm transition-all"
                    style={{ height: `${h}%`, background: i === chartData.length - 1 ? '#00BB78' : '#EBEBEB' }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#616B68' }}>
                <div className={`w-2 h-2 rounded-full ${plot.health_score > 0.8 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>12 days until harvest</span>
              </div>
            </div>
          ))}

          {/* Add New Card Placeholder */}
          <button
            onClick={() => navigateTo('landmark')}
            className="min-w-[25%] flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed bg-white transition-colors"
            style={{ borderColor: '#EBEBEB', color: '#616B68' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1" style={{ background: '#F7F9F8' }}>
              <Plus size={16} style={{ color: '#00BB78' }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Add Field</span>
          </button>
        </div>

        {/* 3. Map Section */}
        <div className="mx-5 mb-6 h-[400px] rounded-3xl overflow-hidden relative shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
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

              {plots.map((plot) => (
                <Polygon
                  key={plot.id}
                  positions={plot.coordinates}
                  pathOptions={{
                    color: '#00BB78',
                    fillColor: '#00BB78',
                    fillOpacity: selectedPlot?.id === plot.id ? 0.4 : 0.1,
                    weight: selectedPlot?.id === plot.id ? 3 : 1
                  }}
                  eventHandlers={{ click: () => setSelectedPlot(plot) }}
                />
              ))}
            </MapContainer>
          )}

          {/* Map Controls */}
          <div className="absolute top-4 left-4 z-[400]">
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform bg-white"
              style={{ color: '#001A11' }}
              onClick={() => setRecenterTrigger(prev => prev + 1)}
            >
              <MapPin size={18} />
            </button>
          </div>

          {/* Bottom Stats Card */}
          <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-2xl shadow-lg z-[400]" style={{ border: '1px solid #F0F0F0' }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-bold" style={{ color: '#001A11' }}>{selectedPlot?.name || 'Your Field'}</h3>
                <p className="text-[10px] font-medium" style={{ color: '#616B68' }}>{selectedPlot?.area ? `${selectedPlot.area} ha` : 'N/A'}</p>
              </div>
              <button className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-500 hover:text-green-600 transition-colors">
                <MoreVertical size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-2 gap-x-6">
              {stats.map((s, i) => (
                <div key={i} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                  <span className="text-[10px] uppercase font-black" style={{ color: '#616B68' }}>{s.label}</span>
                  <span className="text-xs font-bold" style={{ color: '#001A11' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating Scan Button inside the map */}
          <button
            className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-[400] text-white transition-transform active:scale-95"
            style={{ background: '#001A11' }}
            onClick={handleScan}
            disabled={isScanning || !selectedPlot}
          >
            {isScanning ? <Loader2 size={18} className="animate-spin" /> : <ScanLine size={18} />}
          </button>
        </div>

      </div>

      {/* Analysis Modal */}
      {showAnalysisModal && analysisResult && (
        <div className="absolute inset-0 z-[500] bg-black/50 flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white w-full rounded-t-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E0E0E0' }} />
            <button
              onClick={() => setShowAnalysisModal(false)}
              className="absolute top-6 right-5 p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#E8FBF3' }}>
                <Activity size={20} style={{ color: '#00BB78' }} />
              </div>
              <div>
                <h3 className="text-lg font-black" style={{ color: '#001A11' }}>Analysis Report</h3>
                <p className="text-[11px] font-bold" style={{ color: '#616B68' }}>{selectedPlot?.name}</p>
              </div>
            </div>

            {/* Satellite Data Source Banner */}
            {analysisResult.status === 'earth_engine' ? (
              <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-2xl" style={{ background: '#E8FBF3', border: '1px solid #A5FFA7' }}>
                <Satellite size={16} style={{ color: '#00BB78' }} className="shrink-0" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: '#00BB78' }}>🟢 Live Satellite Data</p>
                  <p className="text-[10px] font-medium mt-0.5" style={{ color: '#001A11' }}>Google Earth Engine · Sentinel-2 · SMAP Soil Moisture</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 mb-4 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide">🟡 Estimated Data</p>
                  <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                    {analysisResult.fallback_reason || 'Satellite imagery unavailable. Values are modelled estimates.'}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Yield Forecast */}
              <div className="p-4 rounded-2xl" style={{ background: '#F7F9F8', border: '1px solid #F0F0F0' }}>
                <p className="text-[10px] uppercase font-black mb-1" style={{ color: '#616B68' }}>Predicted Yield</p>
                <h4 className="text-2xl font-black" style={{ color: '#001A11' }}>{analysisResult.predicted_yield_tons_per_ha} <span className="text-sm font-semibold" style={{ color: '#616B68' }}>Tons/ha</span></h4>
                <p className="text-xs font-bold mt-1" style={{ color: '#616B68' }}>Total: {analysisResult.total_estimated_yield_tons} Tons | Rev: ₹{analysisResult.estimated_revenue_inr?.toLocaleString()}</p>
              </div>

              {/* Carbon Signal */}
              <div className="p-4 rounded-2xl" style={{ background: '#E8FBF3', border: '1px solid #A5FFA7' }}>
                <p className="text-[10px] uppercase font-black mb-1" style={{ color: '#00BB78' }}>Carbon Signal</p>
                <h4 className="text-2xl font-black" style={{ color: '#001A11' }}>{analysisResult.estimated_carbon_credits?.toFixed?.(2) ?? '0.00'} <span className="text-sm font-semibold" style={{ color: '#00BB78' }}>ACT</span></h4>
                <p className="text-xs font-bold mt-1" style={{ color: '#00BB78' }}>
                  Issuable: {analysisResult.issuable_carbon_credits?.toFixed?.(2) ?? '0.00'} | Area: {analysisResult.area_hectares?.toFixed?.(2) ?? '0.00'} ha
                </p>
              </div>

              {/* Alerts */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#616B68' }}>System Alerts</h4>
                <div className="space-y-2">
                  {analysisResult.alerts?.map((alert: string, idx: number) => (
                    <div key={idx} className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${alert.includes('ANOMALY') || alert.includes('🔴') ? 'bg-red-50 text-red-700 border-red-100' :
                      alert.includes('🟠') ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-gray-50 text-gray-700 border-gray-100'
                      }`}>
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl text-center" style={{ background: '#F7F9F8', border: '1px solid #F0F0F0' }}>
                  <p className="text-[10px] uppercase font-black" style={{ color: '#616B68' }}>Health Score</p>
                  <p className="text-xl font-black mt-1" style={{ color: '#001A11' }}>{(analysisResult.ndvi_avg * 100).toFixed(0)}%</p>
                </div>
                <div className="p-4 rounded-2xl text-center" style={{ background: '#F7F9F8', border: '1px solid #F0F0F0' }}>
                  <p className="text-[10px] uppercase font-black" style={{ color: '#616B68' }}>Moisture</p>
                  <p className="text-xl font-black mt-1" style={{ color: '#001A11' }}>{(analysisResult.soil_moisture).toFixed(0)}%</p>
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
