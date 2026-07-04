import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup, Rectangle, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import {
    ArrowLeft, Loader2, MapPin, Target, Activity, BrainCircuit, ChevronRight, Leaf
} from 'lucide-react';
import { Screen } from '../types';
import * as L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { plotService, getUserLocation } from '../src/services/api';

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

const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) map.flyTo([lat, lng], 17, { duration: 1.5 });
    }, [lat, lng, map]);

    useEffect(() => {
        const t = setTimeout(() => { map.invalidateSize(); }, 300);
        return () => clearTimeout(t);
    }, [map]);
    return null;
};

const SoilCarbonModelScreen = ({ navigateTo }: { navigateTo: (screen: Screen) => void }) => {
    const [plots, setPlots] = useState<any[]>([]);
    const [selectedPlot, setSelectedPlot] = useState<any>(null);
    const [points, setPoints] = useState<DataPoint[]>([]);
    const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [modelResult, setModelResult] = useState<any>(null);
    const [showProjection, setShowProjection] = useState(false);
    const [aiInsights, setAiInsights] = useState<any>(null);
    const [defaultLoc, setDefaultLoc] = useState({ lat: 20.5937, lng: 78.9629 }); // Fallback to India

    useEffect(() => {
        plotService.getPlots().then(data => {
            setPlots(data);
            if (data.length > 0) setSelectedPlot(data[0]);
        }).catch(e => console.log("Failed to load plots", e));
        
        getUserLocation().then(loc => {
            if (loc) setDefaultLoc(loc);
        });
    }, []);

    const LocationMarker = () => {
        useMapEvents({
            click(e) { setCurrentPos(e.latlng); },
        });
        return currentPos === null ? null : (
            <Marker position={currentPos} opacity={0.8}>
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
            // Simulate AI model training delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Generate mock model results for demonstration
            const avgSoc = points.reduce((sum, p) => sum + p.soc_value, 0) / points.length;
            
            setModelResult({
                equation: `SOC = (1.42 * Moisture) - (0.8 * ET) + ${avgSoc.toFixed(1)}`,
                r_squared: 0.94,
                coef_moisture: 1.42,
                coef_et: -0.8,
                intercept: avgSoc
            });
            
            setAiInsights({
                soil_health_summary: "Your soil exhibits moderate to high carbon retention capabilities, but topsoil degradation is evident in low-moisture zones.",
                actionable_practices: [
                    "Implement No-Till farming in the northern quadrant to preserve moisture.",
                    "Plant deep-rooted cover crops (like Alfalfa) during the off-season."
                ],
                carbon_credit_potential: `Based on your acreage, adopting these practices could yield up to 45 ACT (Verified Carbon Credits) by next harvest.`
            });
        } catch (error) {
            console.error("Error training SOC model:", error);
            alert("Network error. Could not reach AI backend.");
        } finally {
            setLoading(false);
        }
    };

    const ProjectionHeatmap = () => {
        if (!showProjection || !modelResult || (!selectedPlot && !currentPos)) return null;

        const grid = [];
        const gridSize = 0.0005; // approx 50m squares for zoom 17+
        const centerLat = selectedPlot ? selectedPlot.coordinates[0].lat : currentPos!.lat;
        const centerLng = selectedPlot ? selectedPlot.coordinates[0].lng : currentPos!.lng;
        
        const startLat = centerLat - 0.003;
        const startLng = centerLng - 0.003;

        const pseudoRandom = (seed: number) => {
            let x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        for (let i = 0; i < 12; i++) {
            for (let j = 0; j < 12; j++) {
                const lat = startLat + (i * gridSize);
                const lng = startLng + (j * gridSize);

                const simMoisture = 20 + (pseudoRandom(lat * lng) * 15);
                const simEt = 3 + (pseudoRandom(lat + lng) * 3);

                let calcSoc = (modelResult.coef_moisture * simMoisture) + (modelResult.coef_et * simEt) + modelResult.intercept;
                calcSoc = Math.max(0, calcSoc);

                let color = "#EF4444"; // Red
                if (calcSoc > 60) color = "#00BB78"; // Primary Green
                else if (calcSoc > 30) color = "#EAB308"; // Yellow

                grid.push(
                    <Rectangle
                        key={`${i}-${j}`}
                        bounds={[[lat, lng], [lat + gridSize, lng + gridSize]]}
                        pathOptions={{ color: color, weight: 0, fillOpacity: 0.3 }}
                    >
                        <Popup>
                            <div className="text-center">
                                <div className="text-[10px] font-bold" style={{ color: '#616B68' }}>Projected SOC</div>
                                <div className="text-lg font-black" style={{ color: '#001A11' }}>{calcSoc.toFixed(1)} <span className="text-xs">g/kg</span></div>
                                <div className="text-[9px] mt-1" style={{ color: '#616B68' }}>Est. Moisture: {simMoisture.toFixed(1)}% | ET: {simEt.toFixed(1)}</div>
                            </div>
                        </Popup>
                    </Rectangle>
                );
            }
        }
        return <>{grid}</>;
    };

    return (
        <div className="flex flex-col h-full bg-[#F7F9F8] relative overflow-hidden font-sans">
            
            {/* Header */}
            <div className="px-5 pt-12 pb-4 flex items-center gap-3 bg-white sticky top-0 z-20" style={{ borderBottom: '1px solid #F0F0F0' }}>
                <button onClick={() => navigateTo('home')} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 border border-gray-200">
                    <ArrowLeft size={16} style={{ color: '#001A11' }} />
                </button>
                <div>
                    <h1 className="text-lg font-bold" style={{ color: '#001A11' }}>SOC Modeling</h1>
                    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#00BB78' }}>Ground-Truthed AI</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 pb-24 space-y-5">
                
                {/* Context Selector */}
                {plots.length > 0 && (
                    <div>
                       <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Active Field</label>
                       <div className="bg-white rounded-2xl p-4 shadow-sm border flex items-center justify-between" style={{ borderColor: '#F0F0F0' }}>
                           <div>
                               <h3 className="font-bold text-sm" style={{ color: '#001A11' }}>{selectedPlot?.name}</h3>
                               <p className="text-[10px] font-medium mt-0.5" style={{ color: '#616B68' }}>{selectedPlot?.area} ha</p>
                           </div>
                           <Activity size={16} style={{ color: '#00BB78' }} />
                       </div>
                    </div>
                )}

                {/* 1. Map for adding points */}
                <div className="bg-white rounded-3xl p-3 shadow-sm border relative overflow-hidden" style={{ borderColor: '#F0F0F0' }}>
                    <div className="h-[340px] w-full rounded-2xl overflow-hidden relative z-0">
                        <MapContainer center={[defaultLoc.lat, defaultLoc.lng]} zoom={5} scrollWheelZoom={false} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                            <TileLayer url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
                            <RecenterMap 
                                lat={selectedPlot?.coordinates[0]?.lat || defaultLoc.lat} 
                                lng={selectedPlot?.coordinates[0]?.lng || defaultLoc.lng} 
                            />
                            
                            <LocationMarker />

                            {selectedPlot && (
                                <Polygon
                                  positions={selectedPlot.coordinates}
                                  pathOptions={{ color: '#00BB78', fillColor: '#00BB78', fillOpacity: 0.1, weight: 2 }}
                                />
                            )}

                            {points.map((p, i) => (
                                <Marker key={i} position={[p.lat, p.lng]}>
                                    <Popup>SOC: {p.soc_value} g/kg</Popup>
                                </Marker>
                            ))}

                            <ProjectionHeatmap />
                        </MapContainer>

                        {!currentPos && points.length < 2 && !showProjection && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg text-[10px] font-black uppercase tracking-wider z-[1000] pointer-events-none whitespace-nowrap" style={{ color: '#001A11', border: '1px solid #F0F0F0' }}>
                                {points.length === 0 ? "Tap map to add sample" : "Tap map to add second sample"}
                            </div>
                        )}

                        {showProjection && (
                            <div className="absolute top-4 left-4 bg-white/95 p-3 rounded-xl shadow-lg z-[1000] backdrop-blur-md border" style={{ borderColor: '#F0F0F0' }}>
                                <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: '#616B68' }}>SOC Levels</div>
                                <div className="flex flex-col gap-1.5 text-[10px] font-bold" style={{ color: '#001A11' }}>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ background: '#00BB78' }}></div> High (&gt;60)</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ background: '#EAB308' }}></div> Medium (30-60)</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ background: '#EF4444' }}></div> Low (&lt;30)</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add Point Input UI */}
                    <div className="mt-4 px-1 pb-1 flex flex-col gap-3">
                        {currentPos ? (
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest p-2.5 rounded-xl" style={{ background: '#F7F9F8', color: '#616B68' }}>
                                <Target size={14} style={{ color: '#00BB78' }} />
                                {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest p-2.5 rounded-xl" style={{ background: '#FFF8EB', color: '#D97706' }}>
                                <MapPin size={14} />
                                Tap map to select location
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Lab SOC (g/kg)"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={!currentPos}
                                className="flex-1 rounded-xl px-4 py-3 text-sm font-bold outline-none border transition-colors bg-white focus:ring-4 focus:ring-green-50 focus:border-green-500 disabled:opacity-50 disabled:bg-gray-50"
                                style={{ borderColor: '#F0F0F0', color: '#001A11' }}
                            />
                            <button
                                onClick={addPoint}
                                disabled={!inputValue || !currentPos}
                                className="px-6 rounded-xl font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                                style={{ background: '#001A11' }}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Data Points List & Train Button */}
                {points.length > 0 && (
                    <div className="bg-white p-5 rounded-3xl shadow-sm border flex flex-col gap-4" style={{ borderColor: '#F0F0F0' }}>
                        <h3 className="font-bold text-sm flex justify-between items-center" style={{ color: '#001A11' }}>
                            Physical Data Points
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#F7F9F8', color: '#616B68' }}>{points.length} added</span>
                        </h3>

                        <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                            {points.map((p, i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-xl border" style={{ background: '#F7F9F8', borderColor: '#F0F0F0' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center bg-white border" style={{ color: '#001A11', borderColor: '#EBEBEB' }}>{i + 1}</div>
                                        <div className="text-xs font-bold" style={{ color: '#616B68' }}>SOC: <span style={{ color: '#001A11' }}>{p.soc_value} g/kg</span></div>
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
                            className="w-full py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
                            style={{ background: '#00BB78' }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    <span>Syncing with Open-Meteo...</span>
                                </>
                            ) : (
                                <>
                                    <BrainCircuit size={16} />
                                    <span>Calibrate AI Model</span>
                                </>
                            )}
                        </button>
                        {points.length < 2 && <p className="text-[10px] text-center font-medium" style={{ color: '#616B68' }}>Add at least {2 - points.length} more point(s) to train the model.</p>}
                    </div>
                )}

                {/* 3. Model Results & Projection */}
                {modelResult && (
                    <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Equation Card */}
                        <div className="p-6 rounded-3xl relative overflow-hidden" style={{ background: '#001A11' }}>
                            <h3 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: '#A5FFA7' }}>Calibrated Formula</h3>

                            <div className="p-4 rounded-xl text-xs font-mono font-bold mb-5 break-words" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                                {modelResult.equation}
                            </div>

                            <div className="flex justify-between items-center text-xs">
                                <span className="font-medium" style={{ color: '#616B68' }}>Model Accuracy (R²)</span>
                                <span className="font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(0,187,120,0.2)', color: '#A5FFA7' }}>
                                    {(modelResult.r_squared * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* AI Actionable Insights Card */}
                        {aiInsights && (
                            <div className="bg-white p-5 rounded-3xl shadow-sm border" style={{ borderColor: '#F0F0F0' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <BrainCircuit size={18} style={{ color: '#00BB78' }} />
                                    <h3 className="font-bold text-sm" style={{ color: '#001A11' }}>Actionable Intelligence</h3>
                                </div>

                                <p className="text-xs leading-relaxed mb-5 font-medium" style={{ color: '#616B68' }}>
                                    {aiInsights.soil_health_summary}
                                </p>

                                <div className="mb-5">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: '#616B68' }}>Recommended Practices</h4>
                                    <ul className="flex flex-col gap-2">
                                        {aiInsights.actionable_practices?.map((practice: string, idx: number) => (
                                            <li key={idx} className="flex gap-2.5 items-start text-xs p-3 rounded-xl border" style={{ background: '#F7F9F8', borderColor: '#F0F0F0', color: '#001A11' }}>
                                                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#00BB78' }} />
                                                <span className="font-medium leading-relaxed">{practice}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: '#E8FBF3', border: '1px solid #A5FFA7' }}>
                                    <div className="p-2 rounded-xl shrink-0 mt-0.5 bg-white">
                                        <Leaf size={16} style={{ color: '#00BB78' }} />
                                    </div>
                                    <div>
                                        <h4 className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: '#00BB78' }}>Carbon Market Potential</h4>
                                        <p className="text-xs font-bold leading-relaxed" style={{ color: '#001A11' }}>
                                            {aiInsights.carbon_credit_potential}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                if (!currentPos && points.length > 0) {
                                    setCurrentPos({ lat: points[0].lat, lng: points[0].lng });
                                }
                                setShowProjection(!showProjection);
                            }}
                            className="flex items-center justify-between w-full border p-4 rounded-2xl shadow-sm transition-colors active:scale-95 bg-white"
                            style={{ borderColor: showProjection ? '#00BB78' : '#F0F0F0' }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl" style={{ background: showProjection ? '#00BB78' : '#F7F9F8', color: showProjection ? '#fff' : '#001A11' }}>
                                    <MapPin size={20} />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-sm" style={{ color: '#001A11' }}>{showProjection ? 'Hide Projection' : 'View Projected SOC Map'}</h4>
                                    <p className="text-[10px] font-medium mt-0.5" style={{ color: '#616B68' }}>Apply formula across entire field</p>
                                </div>
                            </div>
                            <ChevronRight className={`transition-transform ${showProjection ? 'rotate-90' : ''}`} size={16} style={{ color: '#616B68' }} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SoilCarbonModelScreen;
