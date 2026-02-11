import React from 'react';
import { Leaf, Globe } from 'lucide-react';
import { Language } from '../types';
import { languages, translations } from '../translations';

interface LandingScreenProps {
    onLogin: () => void;
    onBrowse: () => void; // Guest mode
    currentLang: Language;
    onLangChange: (lang: Language) => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ onLogin, onBrowse, currentLang, onLangChange }) => {
    const t = translations[currentLang];

    return (
        <div
            className="absolute inset-0 z-40 flex flex-col items-center justify-between pb-10 pt-20"
            style={{
                backgroundImage: 'url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1080)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80"></div>

            {/* Hero Section */}
            <div className="relative z-10 flex flex-col items-center animate-in slide-in-from-top duration-700">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-green-600 relative overflow-hidden">
                    <div className="absolute inset-0 border-4 border-white rounded-full m-1"></div>
                    <div className="flex flex-col items-center">
                        <Leaf size={48} className="text-green-700" strokeWidth={2} />
                        <div className="w-12 h-1 bg-green-200 mt-2 rounded-full"></div>
                    </div>
                </div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-wider uppercase drop-shadow-md text-center px-4">
                    Krishi Drishti
                </h1>
                <p className="text-white/90 text-sm font-medium tracking-widest uppercase bg-black/30 px-4 py-1 rounded-full backdrop-blur-sm">
                    Empowering Farmers
                </p>
            </div>

            {/* Language Selector */}
            <div className="relative z-10 w-full px-8">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center gap-2 text-white/80 mb-3 text-xs font-bold uppercase tracking-wider">
                        <Globe size={14} />
                        Select Language
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {languages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => onLangChange(lang.code as Language)}
                                className={`py-2 rounded-xl text-sm font-bold transition-all ${currentLang === lang.code
                                        ? 'bg-green-500 text-white shadow-lg scale-105 ring-2 ring-white/50'
                                        : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                            >
                                {lang.native}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 w-full px-8 flex flex-col gap-4 animate-in slide-in-from-bottom duration-700 fade-in">
                <button
                    onClick={onLogin}
                    className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-green-900/40 active:scale-95 transition-transform flex items-center justify-center gap-2 border border-green-400"
                >
                    Get Started
                    <span className="bg-white/20 rounded-full p-1"><Leaf size={16} fill="white" /></span>
                </button>

                <button
                    onClick={onBrowse}
                    className="w-full bg-white text-green-800 py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
                >
                    Continue as Guest
                </button>

                <p className="text-white/60 text-xs text-center mt-4">
                    By continuing, you verify that you are 18+ years old.
                </p>
            </div>
        </div>
    );
};

export default LandingScreen;
