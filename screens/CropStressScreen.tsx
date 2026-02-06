import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';

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

const CropStressScreen = () => {
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [cropType, setCropType] = useState("Wheat");

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
            const token = localStorage.getItem('ks_token');
            const response = await axios.post('http://127.0.0.1:8000/api/ai/analyze/stress', {
                lat: position.lat,
                lng: position.lng,
                crop_type: cropType,
                sensor_data: {}
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResult(response.data);
        } catch (error) {
            console.error("Error analyzing stress:", error);
            alert("Failed to analyze crop stress. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-full bg-slate-50 p-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="text-orange-500" />
                    Crop Stress Detection
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    Click on the map to select your farm location, then analyze for stress.
                </p>

                <div className="mt-4 flex gap-4 items-center">
                    <label className="text-sm font-medium text-slate-700">Crop Type:</label>
                    <select
                        value={cropType}
                        onChange={(e) => setCropType(e.target.value)}
                        className="p-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option>Wheat</option>
                        <option>Rice</option>
                        <option>Maize</option>
                        <option>Cotton</option>
                        <option>Soybean</option>
                    </select>

                    <button
                        onClick={analyzeStress}
                        disabled={!position || loading}
                        className={`px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 text-sm
                            ${!position || loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
                        `}
                    >
                        {loading && <Loader2 className="animate-spin w-4 h-4" />}
                        {loading ? 'Analyzing...' : 'Analyze Health'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {/* Map Section */}
                <div className="h-[450px] w-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative z-0">
                    <MapContainer center={[20.5937, 78.9629]} zoom={5} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationMarker />
                    </MapContainer>
                    {!position && (
                        <div className="absolute top-4 right-4 bg-white/90 p-2 rounded shadow text-xs text-slate-600 z-[1000]">
                            Click map to place pin
                        </div>
                    )}
                </div>

                {/* Results Section */}
                {result && (
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 animate-in slide-in-from-bottom-5 duration-300">
                        <h3 className="font-semibold text-lg text-slate-800 mb-4 border-b pb-2">Analysis Report</h3>

                        <div className="space-y-4">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <span className="text-xs font-semibold text-slate-500 uppercase">Satellite Data</span>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="bg-white p-2 rounded border border-slate-100">
                                        <div className="text-xs text-slate-400">NDVI</div>
                                        <div className="font-mono text-green-700 font-bold">{result.satellite_data.ndvi}</div>
                                    </div>
                                    <div className="bg-white p-2 rounded border border-slate-100">
                                        <div className="text-xs text-slate-400">Moisture</div>
                                        <div className="font-mono text-blue-600 font-bold">{result.satellite_data.soil_moisture}%</div>
                                    </div>
                                </div>
                            </div>

                            <div className={`p-4 rounded-lg border-l-4 ${result.ai_analysis.stress_level === 'Low' ? 'bg-green-50 border-green-500' :
                                result.ai_analysis.stress_level === 'Medium' ? 'bg-yellow-50 border-yellow-500' :
                                    'bg-red-50 border-red-500'
                                }`}>
                                <div className="flex items-center gap-2 font-bold mb-1">
                                    <Info className="w-5 h-5" />
                                    Stress Level: {result.ai_analysis.stress_level}
                                </div>
                                <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                                    {result.ai_analysis.recommendation}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CropStressScreen;
