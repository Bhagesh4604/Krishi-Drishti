import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { getUserLocation } from '../src/services/api';
import {
    AlertTriangle,
    CheckCircle,
    Info,
    Loader2,
    ArrowLeft,
    Activity,
    Droplets,
    Thermometer,
    Zap,
    MapPin,
    TrendingUp,
    ScanLine,
    Leaf
} from 'lucide-react';
import { Screen } from '../types';

// Fix for Leaflet default icon not showing
import * as L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const CropStressScreen = ({ navigateTo }: { navigateTo: (screen: Screen) => void }) => {
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [cropType, setCropType] = useState("Wheat");

    React.useEffect(() => {
        getUserLocation().then(loc => setPosition(loc));
    }, []);

    const LocationMarker = () => {
        useMapEvents({
            click(e) {
                setPosition(e.latlng);
                setResult(null); // Reset result on new pin
            },
        });
        return position === null ? null : (
            <Marker position={position}>
                <Popup>Selected Location</Popup>
            </Marker>
        );
    };

    const analyzeStress = async () => {
        if (!position) return;

        setLoading(true);
        try {
            // Real API Call
            const token = localStorage.getItem('ks_token');
            const response = await axios.post('http://127.0.0.1:8000/api/ai/analyze/stress', {
                lat: position.lat,
                lng: position.lng,
                crop_type: cropType,
                sensor_data: {}
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Real Precision Ag Data:", response.data);
            setResult(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error analyzing stress:", error);
            alert("Failed to analyze crop stress. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 relative pb-24 font-sans max-w-md mx-auto shadow-2xl">
            {/* 1. Header Section */}
            <div className="bg-white px-6 pt-12 pb-4 flex items-center gap-4 relative z-20 shadow-sm rounded-b-[2rem]">
                <button
                    onClick={() => navigateTo('home')}
                    className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="text-gray-700" size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Precision Ag</h1>
                    <p className="text-sm font-medium text-gray-500">Remote Sensing & VRA</p>
                </div>
            </div>

            <div className="p-6 flex flex-col gap-6">

                {/* 2. Map & Targeting Section */}
                <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="h-[250px] w-full rounded-[1.5rem] overflow-hidden relative z-0 border border-slate-100">
                        <MapContainer center={[20.5937, 78.9629]} zoom={5} scrollWheelZoom={false} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <LocationMarker />
                        </MapContainer>
                        {!position && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold z-[1000] backdrop-blur-sm pointer-events-none">
                                Tap map to lock coordinates
                            </div>
                        )}
                        {position && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 text-gray-800 px-4 py-2 rounded-full shadow-lg text-[10px] font-bold z-[1000] flex items-center gap-2 border border-gray-100">
                                <MapPin size={12} className="text-green-600" />
                                {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                            </div>
                        )}
                    </div>

                    <div className="mt-3 px-2 pb-2 flex gap-3 items-center justify-between">
                        <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Crop</label>
                            <select
                                value={cropType}
                                onChange={(e) => setCropType(e.target.value)}
                                className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                            >
                                <option>Wheat</option>
                                <option>Rice</option>
                                <option>Cotton</option>
                                <option>Grapes</option>
                            </select>
                        </div>

                        <button
                            onClick={analyzeStress}
                            disabled={!position || loading}
                            className={`flex-[1.5] py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 text-sm transition-all shadow-md active:scale-95
                                ${!position || loading ? 'bg-slate-300 shadow-none cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 shadow-green-500/30'}
                            `}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin w-5 h-5" />
                                    <span>Scanning...</span>
                                </>
                            ) : (
                                <>
                                    <ScanLine size={18} />
                                    <span>Run Analysis</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 3. Results Dashboard */}
                {result && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

                        {/* A. Spectral Indices (Health) */}
                        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <Activity className="text-blue-500" size={18} />
                                Spectral Indices
                            </h3>

                            <div className="grid grid-cols-3 gap-3">
                                {/* NDVI */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="relative w-16 h-16">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray={`${result.satellite_data.ndvi * 100}, 100`} />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-slate-700">
                                            {result.satellite_data.ndvi.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[10px] font-bold text-slate-800 block">NDVI</span>
                                        <span className="text-[9px] text-slate-400 leading-tight block">Overall Health</span>
                                    </div>
                                </div>

                                {/* NDRE */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="relative w-16 h-16">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eab308" strokeWidth="3" strokeDasharray={`${result.satellite_data.ndre * 100}, 100`} />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-slate-700">
                                            {result.satellite_data.ndre.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[10px] font-bold text-slate-800 block">NDRE</span>
                                        <span className="text-[9px] text-slate-400 leading-tight block">Nitrogen Level</span>
                                    </div>
                                </div>

                                {/* GNDVI */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="relative w-16 h-16">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray={`${result.satellite_data.gndvi * 100}, 100`} />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-slate-700">
                                            {result.satellite_data.gndvi.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[10px] font-bold text-slate-800 block">GNDVI</span>
                                        <span className="text-[9px] text-slate-400 leading-tight block">Water/Nutrient</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* B. Thermal & Hyperspectral Alerts */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-orange-50/50 p-4 rounded-[1.5rem] border border-orange-100 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-full"><Thermometer size={16} /></div>
                                    <span className="text-xs font-bold text-orange-900">Thermal Data</span>
                                </div>
                                <div>
                                    <p className="text-[10px] text-orange-600/70 font-bold uppercase tracking-wide">Water Stress</p>
                                    <p className="font-black text-orange-900">{result.thermal_data.water_stress_index}</p>
                                </div>
                                <div className="text-[10px] text-orange-800/80 font-medium">
                                    Canopy Temp: <span className="font-bold">{result.thermal_data.canopy_temperature}</span>
                                </div>
                            </div>

                            <div className="bg-rose-50/50 p-4 rounded-[1.5rem] border border-rose-100 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-rose-100 text-rose-600 rounded-full"><AlertTriangle size={16} /></div>
                                    <span className="text-xs font-bold text-rose-900">Hyperspectral</span>
                                </div>
                                <div>
                                    <p className="text-[10px] text-rose-600/70 font-bold uppercase tracking-wide">Fungal Risk</p>
                                    <p className="font-black text-rose-900 leading-tight">{result.hyperspectral_data.fungal_risk}</p>
                                </div>
                            </div>
                        </div>

                        {/* C. Variable Rate Application (VRA) Recommendations */}
                        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                            {/* Visual background treatment */}
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-50 rounded-full opacity-50 pointer-events-none"></div>

                            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4 relative z-10">
                                <Zap className="text-amber-500 fill-amber-500" size={18} />
                                Variable Rate Application (VRA)
                            </h3>

                            <div className="space-y-4 relative z-10">
                                {/* Fertilizer */}
                                <div className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <Leaf size={14} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Fertilizer (Nitrogen)</h4>
                                        <p className="text-sm text-slate-600 mt-0.5 leading-snug">{result.precision_ag_vra.nitrogen}</p>
                                    </div>
                                </div>
                                <div className="h-px w-full bg-slate-50"></div>

                                {/* Water */}
                                <div className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <Droplets size={14} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Irrigation</h4>
                                        <p className="text-sm text-slate-600 mt-0.5 leading-snug">{result.precision_ag_vra.water}</p>
                                    </div>
                                </div>
                                <div className="h-px w-full bg-slate-50"></div>

                                {/* Pesticide */}
                                <div className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <ScanLine size={14} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Pesticide</h4>
                                        <p className="text-sm text-slate-600 mt-0.5 leading-snug">{result.precision_ag_vra.pesticide}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* D. AI Summary Decision Support System */}
                        <div className={`p-5 rounded-[2rem] border relative overflow-hidden ${result.ai_analysis.stress_level === 'Low' ? 'bg-green-50/50 border-green-100' :
                            result.ai_analysis.stress_level === 'Medium' ? 'bg-amber-50/50 border-amber-100' :
                                'bg-red-50/50 border-red-100'
                            }`}>
                            <div className="flex items-center gap-2 font-bold mb-2">
                                <Info className={`w-5 h-5 ${result.ai_analysis.stress_level === 'Low' ? 'text-green-600' :
                                    result.ai_analysis.stress_level === 'Medium' ? 'text-amber-600' :
                                        'text-red-600'
                                    }`} />
                                <span className="text-slate-800">Decision Support System Summary</span>
                            </div>
                            <div className="inline-block px-3 py-1 bg-white rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm border border-slate-100 mb-3">
                                Status: <span className={
                                    result.ai_analysis.stress_level === 'Low' ? 'text-green-600' :
                                        result.ai_analysis.stress_level === 'Medium' ? 'text-amber-600' :
                                            'text-red-600'
                                }>{result.ai_analysis.stress_level} Stress</span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                {result.ai_analysis.recommendation}
                            </p>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default CropStressScreen;
