import React from 'react';
import { ChevronRight, Leaf } from 'lucide-react';
import { Language } from '../types';
import { languages, translations } from '../translations';

interface LandingScreenProps {
    onLogin: () => void;
    onBrowse: () => void;
    currentLang: Language;
    onLangChange: (lang: Language) => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ onLogin, onBrowse, currentLang, onLangChange }) => {
    const t = translations[currentLang];

    return (
        <div className="relative h-full w-full flex flex-col justify-end pb-12 overflow-hidden bg-black">
            {/* Background Image */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: 'url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1932&auto=format&fit=crop)', // Tractor/Field alternate
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 z-10" />

            {/* Content */}
            <div className="relative z-20 px-8 w-full">
                {/* Logo / Badge */}
                <div className="flex items-center gap-2 mb-6 animate-in slide-in-from-bottom duration-1000 fill-mode-forwards">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                        <Leaf size={20} fill="currentColor" />
                    </div>
                    <span className="text-white font-bold text-lg tracking-wide uppercase">Krishi Drishti</span>
                </div>

                {/* Main Typography */}
                <div className="mb-10 animate-in slide-in-from-bottom duration-1000 delay-200 fill-mode-forwards">
                    <h1 className="text-5xl font-light text-white leading-tight mb-2">
                        Smart <span className="font-bold text-green-400">Solutions</span>
                    </h1>
                    <h2 className="text-4xl text-white font-thin">
                        Modern <span className="font-medium">Farmers</span>
                    </h2>
                    <p className="text-gray-300 mt-4 text-sm max-w-[280px] leading-relaxed">
                        Empowering farmers with smart tools for better yields and dat-driven decisions.
                    </p>
                </div>

                {/* Action Button (Slide to start style) */}
                <button
                    onClick={() => {
                        console.log("Get Started Clicked");
                        onLogin();
                    }}
                    className="group w-full bg-white/10 backdrop-blur-md border border-white/20 h-16 rounded-full flex items-center justify-between px-2 pl-6 mb-4 active:scale-95 transition-all animate-in slide-in-from-bottom duration-1000 delay-400 fill-mode-forwards"
                >
                    <span className="text-white font-medium tracking-wide">Get Started</span>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center group-hover:bg-green-400 transition-colors">
                        <ChevronRight size={24} className="text-black group-hover:text-white transition-colors" />
                    </div>
                </button>

                {/* Language & Guest */}
                <div className="flex justify-between items-center px-2 opacity-0 animate-in slide-in-from-bottom duration-1000 delay-500 fill-mode-forwards">
                    <button onClick={() => onLangChange(currentLang === 'en' ? 'hi' : 'en')} className="text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
                        {currentLang === 'en' ? 'English' : 'हिंदी'}
                    </button>
                    <button onClick={onBrowse} className="text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
                        Guest Mode
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LandingScreen;
