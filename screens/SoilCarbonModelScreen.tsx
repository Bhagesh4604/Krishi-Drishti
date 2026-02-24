import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import {
    ArrowLeft,
    Loader2,
    MapPin,
    Target,
    Activity,
    BrainCircuit,
    ChevronRight,
    Leaf
} from 'lucide-react';
import { Screen } from '../types';
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

interface DataPoint {
    lat: number;
    lng: number;
    soc_value: number;
}

const SoilCarbonModelScreen = ({ navigateTo }: { navigateTo: (screen: Screen) => void }) => {
    const [points, setPoints] = useState<DataPoint[]>([]);
    const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [modelResult, setModelResult] = useState<any>(null);
    const [showProjection, setShowProjection] = useState(false);
    const [aiInsights, setAiInsights] = useState<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const LocationMarker = () => {
        useMapEvents({
            click(e) {
                setCurrentPos(e.latlng);
            },
        });
        return currentPos === null ? null : (
            <Marker position={currentPos} opacity={0.6}>
                <Popup>New Sample Location</Popup>
            </Marker>
        );
    };

    const addPoint = () => {
        if (currentPos && inputValue) {
            setPoints([...points, { ...currentPos, soc_value: parseFloat(inputValue) }]);
            setCurrentPos(null);
            setInputValue("");
        }
    };

    const removePoint = (index: number) => {
        setPoints(points.filter((_, i) => i !== index));
    };

    const trainModel = async () => {
        if (points.length < 2) {
            alert("You need at least 2 physical data points to train the model.");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('ks_token');
            const response = await axios.post('http://127.0.0.1:8000/api/ai/train-soc',
                { points },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setModelResult(response.data.model);
                setAiInsights(response.data.ai_insights);
            } else {
                alert(response.data.error || "Failed to train model");
            }
        } catch (error) {
            console.error("Error training SOC model:", error);
            alert("Network error. Could not reach AI backend.");
        } finally {
            setLoading(false);
        }
    };

    // MVP: Generate a visual heatmap grid based on the formula
    const ProjectionHeatmap = () => {
        if (!showProjection || !modelResult || !currentPos) return null;

        const grid = [];
        const gridSize = 0.005; // approx 500m squares
        const startLat = currentPos.lat - 0.02;
        const startLng = currentPos.lng - 0.02;

        // Ensure deterministic pseudo-random NDVI for visual variation
        const pseudoRandom = (seed: number) => {
            let x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const lat = startLat + (i * gridSize);
                const lng = startLng + (j * gridSize);

                // Simulate spatial NDVI variation (0.2 to 0.8)
                const simNdvi = 0.2 + (pseudoRandom(lat * lng) * 0.6);

                // CRITICAL: Apply the custom trained mathematical formula
                let calcSoc = (modelResult.slope * simNdvi) + modelResult.intercept;
                calcSoc = Math.max(0, calcSoc); // Floor at 0

                // Color scale (Low=Red, Mid=Yellow, High=Green)
                let color = "#ef4444"; // Red
                if (calcSoc > 60) color = "#22c55e"; // Green
                else if (calcSoc > 30) color = "#eab308"; // Yellow

                grid.push(
                    <Rectangle
                        key={`${i}-${j}`}
                        bounds={[[lat, lng], [lat + gridSize, lng + gridSize]]}
                        pathOptions={{ color: color, weight: 0, fillOpacity: 0.4 }}
                    >
                        <Popup>
                            <div className="text-center">
                                <div className="text-[10px] font-bold text-gray-500">Projected SOC</div>
                                <div className="text-lg font-black text-gray-800">{calcSoc.toFixed(1)} <span className="text-xs">g/kg</span></div>
                                <div className="text-[9px] text-gray-400 mt-1 mt-1">Simulated NDVI: {simNdvi.toFixed(2)}</div>
                            </div>
                        </Popup>
                    </Rectangle>
                );
            }
        }
        return <>{grid}</>;
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 relative pb-24 font-sans max-w-md mx-auto shadow-2xl">
            {/* Header */}
            <div className="bg-white px-6 pt-12 pb-4 flex items-center gap-4 relative z-20 shadow-sm rounded-b-[2rem]">
                <button
                    onClick={() => navigateTo('home')}
                    className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="text-gray-700" size={24} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">SOC Modeling</h1>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ground-Truthed AI</p>
                </div>
            </div>

            <div className="p-6 flex flex-col gap-6">

                {/* 1. Map for adding points */}
                <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100" ref={mapContainerRef}>
                    <div className="h-[220px] w-full rounded-[1.5rem] overflow-hidden relative z-0 border border-slate-100">
                        <MapContainer center={[20.5937, 78.9629]} zoom={5} scrollWheelZoom={false} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <LocationMarker />

                            {/* Render existing confirmed points */}
                            {points.map((p, i) => (
                                <Marker key={i} position={[p.lat, p.lng]}>
                                    <Popup>SOC: {p.soc_value} g/kg</Popup>
                                </Marker>
                            ))}

                            <ProjectionHeatmap />
                        </MapContainer>

                        {!currentPos && points.length === 0 && !showProjection && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full shadow-lg text-[10px] font-bold z-[1000] backdrop-blur-sm pointer-events-none whitespace-nowrap">
                                Tap map to add soil samples
                            </div>
                        )}

                        {showProjection && (
                            <div className="absolute top-4 left-4 bg-white/95 p-3 rounded-xl shadow-lg z-[1000] backdrop-blur-md border border-slate-200">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">SOC Levels</div>
                                <div className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#22c55e] opacity-80"></div> High (&gt;60)</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#eab308] opacity-80"></div> Medium (30-60)</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#ef4444] opacity-80"></div> Low (&lt;30)</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add Point Input UI */}
                    {currentPos && (
                        <div className="mt-3 px-3 pb-3 flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 p-2 rounded-lg">
                                <Target size={14} className="text-blue-500" />
                                {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Enter Lab SOC (g/kg)"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                                />
                                <button
                                    onClick={addPoint}
                                    disabled={!inputValue}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 rounded-xl font-bold shadow-md shadow-blue-500/30 transition-all active:scale-95"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Data Points List & Train Button */}
                {points.length > 0 && (
                    <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4">
                        <h3 className="font-bold text-slate-800 text-sm flex justify-between items-end">
                            Physical Data Points
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{points.length} added</span>
                        </h3>

                        <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-2">
                            {points.map((p, i) => (
                                <div key={i} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-200 text-[10px] font-black text-slate-600 flex items-center justify-center">{i + 1}</div>
                                        <div className="text-xs font-bold text-slate-600">SOC: <span className="text-blue-600">{p.soc_value}</span></div>
                                    </div>
                                    <button onClick={() => removePoint(i)} className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors">
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={trainModel}
                            disabled={points.length < 2 || loading}
                            className={`w-full py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 text-sm transition-all shadow-md active:scale-95 mt-2
                                ${points.length < 2 || loading ? 'bg-slate-300 shadow-none cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-indigo-500/30'}
                            `}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin w-5 h-5" />
                                    <span>Syncing with Earth Engine...</span>
                                </>
                            ) : (
                                <>
                                    <BrainCircuit size={18} />
                                    <span>Calibrate AI Model</span>
                                </>
                            )}
                        </button>
                        {points.length < 2 && <p className="text-[10px] text-center text-slate-500 font-medium">Add at least {2 - points.length} more point(s) to train the model.</p>}
                    </div>
                )}

                {/* 3. Model Results & Projection */}
                {modelResult && (
                    <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Equation Card */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-[2rem] shadow-lg text-white relative overflow-hidden">
                            <Activity className="absolute -right-4 -top-4 w-24 h-24 text-white/5 pointer-events-none" />
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Calibrated Formula</h3>

                            <div className="bg-black/30 p-4 rounded-xl border border-white/10 font-mono text-sm mb-4">
                                {modelResult.equation}
                            </div>

                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Model Accuracy (R²)</span>
                                <span className="font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded border border-green-400/20">
                                    {(modelResult.r_squared * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* AI Actionable Insights Card */}
                        {aiInsights && (
                            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200 animate-in slide-in-from-bottom-6 duration-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <BrainCircuit className="text-violet-600" size={20} />
                                    <h3 className="font-bold text-slate-800 text-sm">Actionable Intelligence</h3>
                                </div>

                                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                                    {aiInsights.soil_health_summary}
                                </p>

                                <div className="mb-4">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recommended Practices</h4>
                                    <ul className="flex flex-col gap-2">
                                        {aiInsights.actionable_practices?.map((practice: string, idx: number) => (
                                            <li key={idx} className="flex gap-2 items-start text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                                                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                                                <span>{practice}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-3">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0 mt-0.5">
                                        <Leaf size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1">Carbon Market Potential</h4>
                                        <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                                            {aiInsights.carbon_credit_potential}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                if (!currentPos && points.length > 0) {
                                    // Center on the first point if no current pos selected
                                    setCurrentPos({ lat: points[0].lat, lng: points[0].lng });
                                }
                                setShowProjection(!showProjection);

                                // Scroll to map to ensure it's visible when "View Projection" is clicked
                                if (!showProjection && mapContainerRef.current) {
                                    setTimeout(() => {
                                        mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 100);
                                }
                            }}
                            className={`flex items-center justify-between w-full border p-4 rounded-2xl shadow-sm transition-colors active:scale-[0.98] ${showProjection
                                ? 'bg-blue-50 border-blue-200 shadow-inner'
                                : 'bg-white border-slate-200 hover:border-blue-300'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${showProjection ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                    <MapPin size={20} />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-slate-800 text-sm">{showProjection ? 'Hide Projection' : 'View Projected SOC Map'}</h4>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Apply formula across entire field</p>
                                </div>
                            </div>
                            <ChevronRight className={`text-slate-400 transition-transform ${showProjection ? 'rotate-90' : ''}`} size={20} />
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SoilCarbonModelScreen;
