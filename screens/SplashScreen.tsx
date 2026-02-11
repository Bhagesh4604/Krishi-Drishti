import React, { useEffect, useState } from 'react';
import { Leaf } from 'lucide-react';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFadeOut(true);
            setTimeout(onFinish, 500);
        }, 2500);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div
            className={`absolute inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'
                }`}
            style={{
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.3), rgba(255,255,255,0.8)), url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1080)',
                backgroundColor: '#E9F3E6', // Fallback
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-white/60 to-white/90"></div>

            {/* Logo and Text */}
            <div className="relative z-10 flex flex-col items-center animate-in zoom-in duration-700">
                {/* Logo Container */}
                <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-green-600 relative overflow-hidden">
                    <div className="absolute inset-0 border-4 border-white rounded-full m-1"></div>
                    <div className="flex flex-col items-center">
                        <Leaf size={64} className="text-green-700" strokeWidth={2} />
                        <div className="w-16 h-1 bg-green-200 mt-2 rounded-full"></div>
                    </div>
                </div>

                {/* App Name */}
                <h1 className="text-3xl font-black text-green-900 mb-1 tracking-wider uppercase drop-shadow-sm" style={{ textShadow: '0 2px 10px rgba(255,255,255,0.8)' }}>
                    Krishi Drishti
                </h1>
                <p className="text-xs font-bold text-green-800 uppercase tracking-[0.4em] bg-white/80 px-4 py-1 rounded-full backdrop-blur-sm">
                    Powered by Satellite Data & AI
                </p>

                {/* Loading Indicator */}
                <div className="mt-16 flex gap-3">
                    {/* Custom loading dots */}
                    <div className="w-3 h-3 bg-green-600 rounded-full animate-bounce shadow-lg border border-white" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce shadow-lg border border-white" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce shadow-lg border border-white" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
            <div className="absolute bottom-8 text-center z-10">
                <p className="text-xs text-green-800 font-bold bg-white/60 px-3 py-1 rounded-full backdrop-blur-sm">
                    Powered by AI & Satellite Data
                </p>
            </div>
        </div>
    );
};

export default SplashScreen;
