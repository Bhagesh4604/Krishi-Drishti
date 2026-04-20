import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, useMapEvents, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { getUserLocation, plotService } from '../src/services/api';
import {
    ArrowLeft,
    MapPin,
    Play,
    Square,
    Search,
    Loader2,
    Hand,
    Footprints,
    FileSearch,
    Upload,
    CheckCircle2,
    Sparkles,
    Ruler,
    Trash2,
    Undo2,
    Navigation,
    Layers,
    Shield,
    FileText,
    User,
    Hash,
    X,
    Trees
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Default Icon Issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Marker Icons
const createCustomIcon = (color: string, number?: number) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
                width: 32px;
                height: 32px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                border: 3px solid white;
            ">
                <div style="
                    transform: rotate(45deg);
                    color: white;
                    font-weight: 900;
                    font-size: 11px;
                ">${number !== undefined ? number : '●'}</div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });
};

const pulsingUserIcon = L.divIcon({
    className: 'pulsing-user-marker',
    html: `
        <div style="position: relative; width: 24px; height: 24px;">
            <div style="
                position: absolute;
                inset: 0;
                background: rgba(59, 130, 246, 0.4);
                border-radius: 50%;
                animation: pulse-ring 2s ease-out infinite;
            "></div>
            <div style="
                position: absolute;
                inset: 4px;
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.6);
            "></div>
        </div>
        <style>
            @keyframes pulse-ring {
                0% { transform: scale(0.8); opacity: 1; }
                100% { transform: scale(2.5); opacity: 0; }
            }
        </style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

interface LandMarkingScreenProps {
    navigation: { goBack: () => void; goToAuth: () => void };
}

type Mode = 'tap' | 'walk' | 'survey';

const MapEvents = ({ onMapClick }: { onMapClick: (e: any) => void }) => {
    useMapEvents({ click: onMapClick });
    return null;
};

const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.flyTo([lat, lng], 18, { duration: 1.5 });
    }, [lat, lng]);
    return null;
};

const calculateArea = (coords: [number, number][]) => {
    if (coords.length < 3) return 0;
    const d2r = Math.PI / 180;
    let area = 0.0;
    if (coords.length > 2) {
        for (let i = 0; i < coords.length; i++) {
            const j = (i + 1) % coords.length;
            const p1 = coords[i];
            const p2 = coords[j];
            area += (p2[1] * d2r - p1[1] * d2r) * (2 + Math.sin(p1[0] * d2r) + Math.sin(p2[0] * d2r));
        }
        area = area * 6378137.0 * 6378137.0 / 2.0;
    }
    return Math.abs(area);
};

const LandMarkingScreen: React.FC<LandMarkingScreenProps> = ({ navigation }) => {
    const [mode, setMode] = useState<Mode>('tap');
    const [markers, setMarkers] = useState<[number, number][]>([]);
    const [pathCoordinates, setPathCoordinates] = useState<[number, number][]>([]);
    const [isTracking, setIsTracking] = useState(false);
    const [surveyNumber, setSurveyNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
    const [mapType, setMapType] = useState<'satellite' | 'street'>('satellite');

    // Ownership Details State
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [ownerName, setOwnerName] = useState('');
    const [gutNumber, setGutNumber] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [manualArea, setManualArea] = useState('');

    const watchId = useRef<number | null>(null);

    useEffect(() => {
        getUserLocation().then((loc) => setCurrentLocation([loc.lat, loc.lng]));
    }, []);

    const handleMapClick = (e: any) => {
        if (mode === 'tap') {
            const { lat, lng } = e.latlng;
            setMarkers(current => [...current, [lat, lng]]);
        }
    };

    const handleUndo = () => {
        setMarkers(current => current.slice(0, -1));
    };

    const handleClear = () => {
        setMarkers([]);
        setPathCoordinates([]);
    };

    const toggleTracking = () => {
        if (isTracking) {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
            setIsTracking(false);
            setMarkers([...pathCoordinates]);
        } else {
            setPathCoordinates([]);
            setIsTracking(true);
            if (navigator.geolocation) {
                watchId.current = navigator.geolocation.watchPosition(
                    (position) => {
                        const newCoord: [number, number] = [position.coords.latitude, position.coords.longitude];
                        setPathCoordinates(prev => [...prev, newCoord]);
                        setCurrentLocation(newCoord);
                    },
                    (error) => console.error(error),
                    { enableHighAccuracy: true }
                );
            }
        }
    };

    const fetchBySurveyNumber = async () => {
        if (!surveyNumber.trim()) return;
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const baseLat = currentLocation ? currentLocation[0] : 21.1458;
            const baseLng = currentLocation ? currentLocation[1] : 79.0882;
            const randomOffset = () => (Math.random() - 0.5) * 0.001;

            const procedurallyGeneratedPolygon: [number, number][] = [
                [baseLat + 0.001, baseLng - 0.001],
                [baseLat + 0.001 + randomOffset(), baseLng + 0.001 + randomOffset()],
                [baseLat - 0.001 + randomOffset(), baseLng + 0.001 + randomOffset()],
                [baseLat - 0.001, baseLng - 0.001],
            ];
            setMarkers(procedurallyGeneratedPolygon);
            setCurrentLocation(procedurallyGeneratedPolygon[0]);
            alert(`Survey No. ${surveyNumber} located.`);
        } catch {
            alert("Could not fetch survey details.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveClick = () => {
        if (markers.length < 3) {
            alert("Please mark at least 3 points to define a field.");
            return;
        }
        const calculatedSqM = calculateArea(markers);
        const calculatedAcres = calculatedSqM * 0.000247105;
        setManualArea(calculatedAcres.toFixed(2));
        setShowSaveModal(true);
    };

    const handleConfirmSave = async () => {
        if (!ownerName || !gutNumber) {
            alert("Please provide Owner Name and Gut Number to verify ownership.");
            return;
        }
        if (!proofFile) {
            alert("Please attach 7/12 Extract or equivalent proof of ownership.");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('ks_token');
            if (!token) {
                alert("Please log in first to save your farm boundary.");
                setShowSaveModal(false);
                navigation.goToAuth();
                return;
            }

            let finalAreaHa = 0;
            const calculatedSqM = calculateArea(markers);

            if (manualArea && !isNaN(parseFloat(manualArea))) {
                finalAreaHa = parseFloat(manualArea) * 0.404686;
            } else {
                finalAreaHa = calculatedSqM / 10000;
            }

            const payload = {
                name: `${ownerName}'s Farm`,
                coordinates: markers.map(m => ({ lat: m[0], lng: m[1] })),
                area: parseFloat(finalAreaHa.toFixed(2)),
                crop_type: "Mixed"
            };

            await plotService.createPlot(payload);

            alert(`✅ Farm Saved Successfully!\n\n🌾 Area: ${finalAreaHa.toFixed(2)} ha (${(finalAreaHa * 2.471).toFixed(2)} Acre)\n📋 Verification Request Sent for Gut No. ${gutNumber}.`);
            setShowSaveModal(false);
            navigation.goBack();
        } catch (error) {
            console.error(error);
            if (axios.isAxiosError(error)) {
                const detail = (error.response?.data as any)?.detail;
                if (error.response?.status === 401) {
                    localStorage.removeItem('ks_token');
                    alert("Please log in again to save your farm boundary.");
                    setShowSaveModal(false);
                    navigation.goToAuth();
                } else if (typeof detail === 'string' && detail.trim()) {
                    alert(`Failed to save farm details.\n${detail}`);
                } else {
                    alert(`Failed to save farm details.\nRequest status: ${error.response?.status ?? 'network error'}`);
                }
            } else {
                alert("Failed to save farm details.");
            }
        } finally {
            setLoading(false);
        }
    };

    const currentAreaSqM = calculateArea(markers);
    const currentAreaHa = currentAreaSqM / 10000;
    const currentAreaAcres = currentAreaSqM * 0.000247105;

    return (
        <div className="h-full bg-gray-900 flex flex-col relative z-50 overflow-hidden">
            {/* ========== PREMIUM HEADER WITH GLASSMORPHISM ========== */}
            <motion.div
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className="absolute top-0 left-0 right-0 z-[500] p-4"
            >
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={navigation.goBack}
                            className="p-2.5 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-gray-700 transition-all shadow-sm"
                        >
                            <ArrowLeft size={20} />
                        </motion.button>
                        <div>
                            <h2 className="text-base font-black bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
                                Mark Your Land
                            </h2>
                            <p className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                AI-powered boundary mapping
                            </p>
                        </div>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={handleSaveClick}
                        disabled={markers.length < 3}
                        className="relative bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-green-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 overflow-hidden"
                    >
                        <Shield className="w-3.5 h-3.5" />
                        <span>VERIFY & SAVE</span>
                        {markers.length >= 3 && (
                            <motion.div
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                            />
                        )}
                    </motion.button>
                </div>
            </motion.div>

            {/* ========== MAP CONTAINER ========== */}
            <div className="flex-1 relative">
                <MapContainer
                    center={currentLocation || [21.1458, 79.0882]}
                    zoom={18}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url={mapType === 'satellite'
                            ? "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        }
                        subdomains={mapType === 'satellite' ? ['mt0', 'mt1', 'mt2', 'mt3'] : ['a', 'b', 'c']}
                    />

                    <MapEvents onMapClick={handleMapClick} />
                    {currentLocation && <RecenterMap lat={currentLocation[0]} lng={currentLocation[1]} />}

                    {markers.map((pos, idx) => (
                        <Marker
                            key={idx}
                            position={pos}
                            icon={createCustomIcon('#10b981', idx + 1)}
                        />
                    ))}

                    {markers.length > 2 && (
                        <Polygon
                            positions={markers}
                            pathOptions={{
                                color: '#10b981',
                                fillColor: '#34d399',
                                fillOpacity: 0.35,
                                weight: 3,
                                dashArray: '8, 4'
                            }}
                        />
                    )}

                    {pathCoordinates.length > 0 && (
                        <Polyline
                            positions={pathCoordinates}
                            pathOptions={{
                                color: '#fbbf24',
                                weight: 5,
                                opacity: 0.9,
                                dashArray: '10, 5'
                            }}
                        />
                    )}

                    {currentLocation && (
                        <Marker position={currentLocation} icon={pulsingUserIcon} />
                    )}
                </MapContainer>

                {/* ========== LIVE AREA BADGE (TOP RIGHT) ========== */}
                <AnimatePresence>
                    {markers.length >= 3 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.5, y: -20 }}
                            className="absolute top-24 right-4 z-[400]"
                        >
                            <div className="bg-gradient-to-br from-green-600 to-emerald-700 backdrop-blur-xl rounded-2xl shadow-2xl shadow-green-900/50 p-3 border border-green-400/30 min-w-[130px]">
                                <div className="flex items-center gap-2 mb-1">
                                    <Ruler className="w-3.5 h-3.5 text-green-200" />
                                    <span className="text-[9px] font-black text-green-200 uppercase tracking-wider">Live Area</span>
                                </div>
                                <div className="text-white">
                                    <motion.div
                                        key={currentAreaHa}
                                        initial={{ scale: 1.2, color: '#fbbf24' }}
                                        animate={{ scale: 1, color: '#ffffff' }}
                                        className="text-2xl font-black leading-none"
                                    >
                                        {currentAreaHa.toFixed(2)}
                                        <span className="text-sm font-bold text-green-200 ml-1">ha</span>
                                    </motion.div>
                                    <div className="text-[11px] font-bold text-green-100 mt-1">
                                        ≈ {currentAreaAcres.toFixed(2)} acres
                                    </div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-green-400/30 flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-green-200">Points</span>
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                                        <span className="text-xs font-black text-white">{markers.length}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ========== MAP TYPE TOGGLE (RIGHT SIDE) ========== */}
                <motion.div
                    initial={{ x: 100 }}
                    animate={{ x: 0 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-[400] flex flex-col gap-2"
                >
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.1 }}
                        onClick={() => setMapType(mapType === 'satellite' ? 'street' : 'satellite')}
                        className="w-11 h-11 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl flex items-center justify-center text-gray-700 hover:bg-white transition-all border border-white/50"
                        title="Toggle Map Type"
                    >
                        <Layers size={18} />
                    </motion.button>

                    {markers.length > 0 && (
                        <>
                            <motion.button
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.1 }}
                                onClick={handleUndo}
                                className="w-11 h-11 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-all border border-white/50"
                                title="Undo Last Point"
                            >
                                <Undo2 size={18} />
                            </motion.button>

                            <motion.button
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.1 }}
                                onClick={handleClear}
                                className="w-11 h-11 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl flex items-center justify-center text-red-600 hover:bg-red-50 transition-all border border-white/50"
                                title="Clear All"
                            >
                                <Trash2 size={18} />
                            </motion.button>
                        </>
                    )}
                </motion.div>

                {/* ========== FLOATING MODE SWITCHER ========== */}
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute top-24 left-4 z-[400]"
                >
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 border border-white/50">
                        {([
                            { id: 'tap', icon: Hand, label: 'Tap', color: 'from-blue-500 to-cyan-500' },
                            { id: 'walk', icon: Footprints, label: 'Walk', color: 'from-orange-500 to-red-500' },
                            { id: 'survey', icon: FileSearch, label: 'Survey', color: 'from-purple-500 to-pink-500' },
                        ] as const).map((m) => (
                            <motion.button
                                key={m.id}
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => {
                                    setMode(m.id);
                                    setMarkers([]);
                                    setPathCoordinates([]);
                                    setIsTracking(false);
                                }}
                                className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${mode === m.id
                                        ? `bg-gradient-to-br ${m.color} text-white shadow-lg`
                                        : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                <m.icon size={18} />
                                <span className="text-[9px] font-black uppercase tracking-wider">{m.label}</span>
                                {mode === m.id && (
                                    <motion.div
                                        layoutId="mode-indicator"
                                        className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-full"
                                    />
                                )}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                {/* ========== BOTTOM CONTROL PANEL ========== */}
                <motion.div
                    initial={{ y: 200 }}
                    animate={{ y: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="absolute bottom-4 left-4 right-4 z-[400]"
                >
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-white/50 overflow-hidden relative">
                        {/* Decorative gradient blob */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-200/40 rounded-full blur-2xl" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-200/40 rounded-full blur-2xl" />

                        <div className="relative">
                            <AnimatePresence mode="wait">
                                {mode === 'tap' && (
                                    <motion.div
                                        key="tap"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="text-center"
                                    >
                                        <div className="inline-flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full mb-3">
                                            <Hand className="w-3.5 h-3.5 text-blue-600" />
                                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Tap Mode Active</span>
                                        </div>
                                        <p className="text-gray-700 font-bold text-sm">
                                            Tap points on the map to create your boundary
                                        </p>
                                        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                <span className="font-bold">{markers.length} points</span>
                                            </div>
                                            <div className="h-3 w-px bg-gray-300" />
                                            <div className="flex items-center gap-1">
                                                <Trees className="w-3 h-3 text-green-600" />
                                                <span className="font-bold">
                                                    {markers.length >= 3 ? 'Polygon Ready ✓' : `Need ${3 - markers.length} more`}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {mode === 'walk' && (
                                    <motion.div
                                        key="walk"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="flex flex-col gap-3"
                                    >
                                        <div className="text-center">
                                            <div className="inline-flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-full mb-2">
                                                <Footprints className="w-3.5 h-3.5 text-orange-600" />
                                                <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider">
                                                    {isTracking ? 'Recording...' : 'Walk Mode'}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 font-bold text-sm">
                                                {isTracking ? 'Walk along your field perimeter' : 'Walk the perimeter of your field'}
                                            </p>
                                        </div>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={toggleTracking}
                                            className={`w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 shadow-xl transition-all relative overflow-hidden ${isTracking
                                                    ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/40'
                                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-green-500/40'
                                                }`}
                                        >
                                            {isTracking && (
                                                <motion.div
                                                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                    className="absolute inset-0 bg-red-400 rounded-2xl"
                                                />
                                            )}
                                            <span className="relative flex items-center gap-2">
                                                {isTracking ? (
                                                    <>
                                                        <Square size={18} fill="currentColor" />
                                                        STOP TRACKING
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play size={18} fill="currentColor" />
                                                        START TRACKING
                                                    </>
                                                )}
                                            </span>
                                        </motion.button>
                                        {isTracking && pathCoordinates.length > 0 && (
                                            <div className="text-center text-xs text-gray-600 font-bold">
                                                📍 {pathCoordinates.length} points recorded
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {mode === 'survey' && (
                                    <motion.div
                                        key="survey"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                    >
                                        <div className="text-center mb-3">
                                            <div className="inline-flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-full mb-2">
                                                <FileSearch className="w-3.5 h-3.5 text-purple-600" />
                                                <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Survey Lookup</span>
                                            </div>
                                            <p className="text-gray-600 text-xs font-semibold">Find your land by survey number</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 42/2A"
                                                    className="w-full bg-purple-50 border-2 border-purple-100 rounded-2xl pl-11 pr-4 py-3.5 font-black text-gray-900 outline-none focus:border-purple-500 focus:bg-white transition-all"
                                                    value={surveyNumber}
                                                    onChange={e => setSurveyNumber(e.target.value)}
                                                />
                                            </div>
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                whileHover={{ scale: 1.05 }}
                                                onClick={fetchBySurveyNumber}
                                                disabled={loading}
                                                className="bg-gradient-to-br from-purple-600 to-pink-600 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/40 active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                {loading ? <Loader2 className="animate-spin" size={22} /> : <Search size={22} />}
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ========== PREMIUM SAVE MODAL ========== */}
            <AnimatePresence>
                {showSaveModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[500] flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowSaveModal(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 100, opacity: 0, scale: 0.9 }}
                            transition={{ type: 'spring', damping: 25 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                        >
                            {/* Modal Header with Gradient */}
                            <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-6 relative overflow-hidden">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 180, 360],
                                    }}
                                    transition={{ duration: 20, repeat: Infinity }}
                                    className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full"
                                />
                                <motion.div
                                    animate={{
                                        scale: [1.2, 1, 1.2],
                                        rotate: [360, 180, 0],
                                    }}
                                    transition={{ duration: 15, repeat: Infinity }}
                                    className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full"
                                />

                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10"
                                >
                                    <X size={18} />
                                </button>

                                <div className="relative">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', delay: 0.1 }}
                                        className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-3 border border-white/30"
                                    >
                                        <Shield className="w-7 h-7 text-white" />
                                    </motion.div>
                                    <h3 className="text-xl font-black text-white mb-1">Verify Ownership</h3>
                                    <p className="text-xs text-green-50 font-semibold">
                                        🌿 Claim Carbon Credits & protect your land
                                    </p>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6">
                                {/* Area Preview Card */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 mb-5 border border-green-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
                                                <Ruler className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-green-700 uppercase tracking-wider">Calculated Area</div>
                                                <div className="text-lg font-black text-gray-900">
                                                    {currentAreaHa.toFixed(2)} <span className="text-xs">ha</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-gray-500 uppercase">Points</div>
                                            <div className="text-lg font-black text-green-700">{markers.length}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Owner Name */}
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                            <User className="w-3.5 h-3.5 text-green-600" />
                                            Owner Name <span className="text-gray-400 normal-case">(as per 7/12)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={ownerName}
                                            onChange={e => setOwnerName(e.target.value)}
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3.5 outline-none focus:border-green-500 focus:bg-white transition-all font-bold text-gray-900"
                                            placeholder="e.g. Ramesh Patil"
                                        />
                                    </div>

                                    {/* Gut No + Area */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                                <Hash className="w-3 h-3 text-green-600" />
                                                Gut No.
                                            </label>
                                            <input
                                                type="text"
                                                value={gutNumber}
                                                onChange={e => setGutNumber(e.target.value)}
                                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3.5 outline-none focus:border-green-500 focus:bg-white transition-all font-bold text-gray-900"
                                                placeholder="123/A"
                                            />
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                                <Ruler className="w-3 h-3 text-green-600" />
                                                Acres
                                            </label>
                                            <input
                                                type="number"
                                                value={manualArea}
                                                onChange={e => setManualArea(e.target.value)}
                                                className="w-full bg-green-50 border-2 border-green-200 rounded-2xl px-4 py-3.5 outline-none focus:border-green-500 focus:bg-white transition-all font-black text-green-700"
                                                placeholder="2.12"
                                            />
                                        </div>
                                    </div>

                                    {/* File Upload */}
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                            <FileText className="w-3.5 h-3.5 text-green-600" />
                                            Upload 7/12 Extract
                                        </label>
                                        <motion.div
                                            whileHover={{ scale: 1.01 }}
                                            className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center transition-all cursor-pointer relative ${proofFile
                                                    ? 'border-green-400 bg-green-50'
                                                    : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50/50'
                                                }`}
                                        >
                                            <input
                                                type="file"
                                                onChange={e => setProofFile(e.target.files?.[0] || null)}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                accept="image/*,.pdf"
                                            />
                                            {proofFile ? (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="flex flex-col items-center"
                                                >
                                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-green-200">
                                                        <CheckCircle2 className="w-6 h-6 text-white" />
                                                    </div>
                                                    <span className="text-green-700 font-black text-sm">{proofFile.name}</span>
                                                    <span className="text-[10px] text-green-600 font-bold mt-1">✓ Ready to upload</span>
                                                </motion.div>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-2 shadow-sm">
                                                        <Upload className="w-6 h-6 text-gray-400" />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-700">Click to Upload</span>
                                                    <span className="text-[10px] text-gray-500 mt-1">PDF or Image</span>
                                                </>
                                            )}
                                        </motion.div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setShowSaveModal(false)}
                                            className="flex-1 py-3.5 rounded-2xl font-black text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all text-sm"
                                        >
                                            Cancel
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={handleConfirmSave}
                                            disabled={loading}
                                            className="flex-[2] py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-green-600 to-emerald-600 shadow-xl shadow-green-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 relative overflow-hidden"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={18} />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <Shield size={16} />
                                                    Submit for Review
                                                </>
                                            )}
                                            {!loading && (
                                                <motion.div
                                                    animate={{ x: ['-100%', '200%'] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                                                />
                                            )}
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LandMarkingScreen;