import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, useMapEvents, useMap } from 'react-leaflet';
import axios from 'axios';
import { ArrowLeft, MapPin, Play, Square, Search, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Default Icon Issue in Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LandMarkingScreenProps {
    navigation: { goBack: () => void };
}

type Mode = 'tap' | 'walk' | 'survey';

// Helper to handle map clicks
const MapEvents = ({ onMapClick }: { onMapClick: (e: any) => void }) => {
    useMapEvents({
        click: onMapClick,
    });
    return null;
};

// Helper to center map
const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.flyTo([lat, lng], 18);
    }, [lat, lng]);
    return null;
};

// --- Area Calculation Logic (Shoelace Formula) ---
// --- Area Calculation Logic (Geodesic - WGS84) ---
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

    return Math.abs(area); // Square meters
};

const formatArea = (sqMeters: number) => {
    const hectares = sqMeters / 10000;
    const acres = sqMeters * 0.000247105;

    // Show both Hectares and Acres for better verification
    return `${hectares.toFixed(2)} ha (${acres.toFixed(2)} Acre)`;
};

const LandMarkingScreen: React.FC<LandMarkingScreenProps> = ({ navigation }) => {
    const [mode, setMode] = useState<Mode>('tap');
    const [markers, setMarkers] = useState<[number, number][]>([]);
    const [pathCoordinates, setPathCoordinates] = useState<[number, number][]>([]);
    const [isTracking, setIsTracking] = useState(false);
    const [surveyNumber, setSurveyNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);

    // Ownership Details State
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [ownerName, setOwnerName] = useState('');
    const [gutNumber, setGutNumber] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [manualArea, setManualArea] = useState(''); // User override for area (Acres)

    // Watch ID for geolocation
    const watchId = useRef<number | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCurrentLocation([position.coords.latitude, position.coords.longitude]);
                },
                (error) => console.error(error),
                { enableHighAccuracy: true }
            );
        }
    }, []);

    const handleMapClick = (e: any) => {
        if (mode === 'tap') {
            const { lat, lng } = e.latlng;
            setMarkers(current => [...current, [lat, lng]]);
        }
    };

    const toggleTracking = () => {
        if (isTracking) {
            // Stop Tracking
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
            setIsTracking(false);
            // Converts path to markers for polygon creation
            setMarkers([...pathCoordinates]);
        } else {
            // Start Tracking
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
            // Mock Data 
            const mockPolygon: [number, number][] = [
                [21.1458, 79.0882],
                [21.1465, 79.0890],
                [21.1460, 79.0900],
                [21.1450, 79.0895],
            ];
            setMarkers(mockPolygon);
            setCurrentLocation(mockPolygon[0]); // Center map
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
        // Pre-fill manual area with calculated area in Acres
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

            // Determine Final Area
            let finalAreaHa = 0;
            const calculatedSqM = calculateArea(markers);

            if (manualArea && !isNaN(parseFloat(manualArea))) {
                // User entered Acres -> Convert to Hectares
                // 1 Acre = 0.404686 Hectares
                finalAreaHa = parseFloat(manualArea) * 0.404686;
            } else {
                // Fallback to calculated
                finalAreaHa = calculatedSqM / 10000;
            }

            // Prepare Payload
            const payload = {
                name: `${ownerName}'s Farm`,
                coordinates: markers.map(m => ({ lat: m[0], lng: m[1] })),
                area: parseFloat(finalAreaHa.toFixed(2)), // Save as hectares
                crop_type: "Mixed"
            };

            await axios.post('http://localhost:8000/api/plots/', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert(`Farm Saved! \nArea: ${finalAreaHa.toFixed(2)} ha (${(finalAreaHa * 2.471).toFixed(2)} Acre)\nOwnership Verification Request Sent for Gut No. ${gutNumber}.`);
            setShowSaveModal(false);
            navigation.goBack();
        } catch (error) {
            console.error(error);
            alert("Failed to save farm details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full bg-white flex flex-col relative z-50">
            {/* Header */}
            <div className="bg-white p-6 pb-4 shadow-sm border-b border-gray-100 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <button onClick={navigation.goBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-xl font-black text-gray-900">Mark Land</h2>
                </div>
                <button
                    onClick={handleSaveClick}
                    className="bg-green-600 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
                >
                    Verify & Save
                </button>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <MapContainer
                    center={currentLocation || [21.1458, 79.0882]}
                    zoom={18}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                    />

                    <MapEvents onMapClick={handleMapClick} />
                    {currentLocation && <RecenterMap lat={currentLocation[0]} lng={currentLocation[1]} />}

                    {/* Markers */}
                    {markers.map((pos, idx) => (
                        <Marker key={idx} position={pos} />
                    ))}

                    {/* Polygon */}
                    {markers.length > 2 && (
                        <Polygon positions={markers} pathOptions={{ color: 'lime', fillColor: 'lime', fillOpacity: 0.4 }} />
                    )}

                    {/* Current Path (Walk Mode) */}
                    {pathCoordinates.length > 0 && (
                        <Polyline positions={pathCoordinates} pathOptions={{ color: 'yellow', weight: 4 }} />
                    )}

                    {/* Current User Pos */}
                    {currentLocation && (
                        <Marker position={currentLocation} icon={L.divIcon({ className: 'bg-blue-500 w-4 h-4 rounded-full border-2 border-white shadow-md' })} />
                    )}

                </MapContainer>

                {/* Floating Mode Switcher */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-xl p-1.5 flex gap-1 z-[400] border border-gray-100">
                    {([
                        { id: 'tap', icon: MapPin, label: 'Tap' },
                        { id: 'walk', icon: Play, label: 'Walk' },
                        { id: 'survey', icon: Search, label: 'Survey' },
                    ] as const).map((m) => (
                        <button
                            key={m.id}
                            onClick={() => { setMode(m.id); setMarkers([]); setPathCoordinates([]); setIsTracking(false); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${mode === m.id ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <m.icon size={16} />
                            <span className="text-xs font-bold">{m.label}</span>
                        </button>
                    ))}
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-6 left-6 right-6 bg-white rounded-3xl p-6 shadow-2xl z-[400] border border-gray-50 animate-in slide-in-from-bottom duration-300">
                    {mode === 'tap' && (
                        <p className="text-center text-gray-500 font-medium text-sm">Tap points on the map to define your boundary.</p>
                    )}

                    {mode === 'walk' && (
                        <div className="flex flex-col gap-3">
                            <p className="text-center text-gray-500 font-medium text-sm">Walk the perimeter of your field.</p>
                            <button
                                onClick={toggleTracking}
                                className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${isTracking ? 'bg-red-500 shadow-red-200' : 'bg-green-600 shadow-green-200'
                                    }`}
                            >
                                {isTracking ? <><Square size={18} fill="currentColor" /> Stop Tracking</> : <><Play size={18} fill="currentColor" /> Start Tracking</>}
                            </button>
                        </div>
                    )}

                    {mode === 'survey' && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Survey No. (e.g. 42/2A)"
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                                value={surveyNumber}
                                onChange={e => setSurveyNumber(e.target.value)}
                            />
                            <button
                                onClick={fetchBySurveyNumber}
                                className="bg-green-600 w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                            >
                                <Search size={24} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/50 z-[500] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Verify Ownership</h3>
                        <p className="text-sm text-gray-500 mb-6">To claim Carbon Credits, please verify that this land belongs to you.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Owner Name (as per 7/12)</label>
                                <input
                                    type="text"
                                    value={ownerName}
                                    onChange={e => setOwnerName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="e.g. Ramesh Patil"
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Gut No.</label>
                                    <input
                                        type="text"
                                        value={gutNumber}
                                        onChange={e => setGutNumber(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="e.g. 123/A"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Area (Acres)</label>
                                    <input
                                        type="number"
                                        value={manualArea}
                                        onChange={e => setManualArea(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 font-bold text-green-700"
                                        placeholder="2.12"
                                    />
                                </div>
                            </div>



                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Upload 7/12 Extract (PDF/Image)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        onChange={e => setProofFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    {proofFile ? (
                                        <span className="text-green-600 font-bold">{proofFile.name}</span>
                                    ) : (
                                        <>
                                            <Square size={24} className="mb-2" />
                                            <span className="text-sm">Click to Upload</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className="flex-1 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmSave}
                                    disabled={loading}
                                    className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Submit for review'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandMarkingScreen;
