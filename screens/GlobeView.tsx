
import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { Minimize2, Navigation } from 'lucide-react';

interface GlobeViewProps {
    userLocation: { lat: number, lng: number } | null;
    plots: any[];
    onClose: () => void;
}



const TILE_DATA = [{ lat: 0, lng: 0, z: 0 }];

const GlobeView: React.FC<GlobeViewProps> = ({ userLocation, plots, onClose }) => {
    const globeEl = useRef<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Initial animation
        setTimeout(() => {
            if (globeEl.current) {
                globeEl.current.controls().autoRotate = true;
                globeEl.current.controls().autoRotateSpeed = 0.3;
                globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
            }
        }, 500);
    }, []);

    const flyToUser = () => {
        if (globeEl.current && userLocation) {
            globeEl.current.controls().autoRotate = false;
            globeEl.current.pointOfView({
                lat: userLocation.lat,
                lng: userLocation.lng,
                altitude: 0.05 // Very close zoom (approx 50km)
            }, 2500);
        }
    };

    // Prepare plot data... (same as before)
    const plotPoints = plots.map(p => {
        let lat = 0, lng = 0;
        if (p.coordinates && p.coordinates.length > 0) {
            lat = p.coordinates.reduce((sum: number, c: any) => sum + c.lat, 0) / p.coordinates.length;
            lng = p.coordinates.reduce((sum: number, c: any) => sum + c.lng, 0) / p.coordinates.length;
        }
        return {
            id: p.id, lat, lng, name: p.name,
            health: p.health_score,
            color: p.health_score > 0.8 ? '#4ade80' : p.health_score > 0.5 ? '#facc15' : '#f87171'
        };
    }).filter(p => p.lat !== 0);

    if (!mounted) return null;

    return (
        <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
            <Globe
                ref={globeEl}
                // Minimal configuration to ensure rendering
                globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"

                // Markers
                pointsData={plotPoints}
                pointLat="lat"
                pointLng="lng"
                pointColor="color"
                pointAltitude={0.05}
                pointRadius={0.4}
                pointLabel="name"
                pointResolution={2}

                // Atmosphere
                atmosphereColor="#3a228a"
                atmosphereAltitude={0.15}
            />

            {/* Overlay UI */}
            <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                <button
                    onClick={onClose}
                    className="bg-white/10 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/20 border border-white/20"
                >
                    <Minimize2 size={24} />
                </button>
            </div>

            <div className="absolute bottom-8 right-8 z-50 flex flex-col gap-4">
                {userLocation && (
                    <button
                        onClick={flyToUser}
                        className="bg-green-600 hover:bg-green-500 text-white p-4 rounded-full shadow-lg shadow-green-900/50 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Navigation size={24} className="fill-current" />
                        <span className="font-bold text-sm">FLY TO ME</span>
                    </button>
                )}
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
                <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-green-500/30 text-white flex items-center gap-3 shadow-2xl">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold uppercase tracking-widest">3D Satellite Recon</span>
                </div>
                {userLocation && (
                    <div className="mt-2 text-center">
                        <p className="text-[10px] text-gray-400 font-mono">
                            GPS: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                        </p>
                        {userLocation.lat === 21.1458 && (
                            <p className="text-[9px] text-red-400 font-bold">(Default Location)</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobeView;
