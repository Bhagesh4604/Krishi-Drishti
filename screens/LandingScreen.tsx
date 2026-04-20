import React from 'react';
import { ChevronRight, Leaf, Lock } from 'lucide-react';
import { Language } from '../types';
import { languages, translations } from '../translations';
import { motion } from 'framer-motion';

interface LandingScreenProps {
    onLogin: () => void;
    onBrowse: () => void;
    onAdminLogin: () => void;
    currentLang: Language;
    onLangChange: (lang: Language) => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ onLogin, onBrowse, onAdminLogin, currentLang, onLangChange }) => {
    const t = translations[currentLang];

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <div className="relative h-full w-full flex flex-col justify-end pb-12 overflow-hidden bg-black">
            {/* Admin Login Button (Top Right) */}
            <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                    const token = window.prompt("Enter Ops Dashboard Token:");
                    if (token === import.meta.env.VITE_ADMIN_SECRET_TOKEN) {
                        onAdminLogin();
                    } else if (token) {
                        alert("Invalid Token.");
                    }
                }}
                className="absolute top-6 right-6 z-20 w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors"
                title="Admin Ops Dashboard"
            >
                <Lock size={16} className="text-white/70" />
            </motion.button>
            {/* Background Image with slow zoom animation */}
            <motion.div
                initial={{ scale: 1.0 }}
                animate={{ scale: 1.1 }}
                transition={{ duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: 'url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1932&auto=format&fit=crop)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 z-10" />

            {/* Content Container */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="relative z-20 px-8 w-full"
            >
                {/* Logo / Badge */}
                <motion.div variants={itemVariants} className="flex items-center gap-2 mb-6">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                        <Leaf size={20} fill="currentColor" />
                    </div>
                    <span className="text-white font-bold text-lg tracking-wide uppercase">Krishi Drishti</span>
                </motion.div>

                {/* Main Typography */}
                <motion.div variants={itemVariants} className="mb-10">
                    <h1 className="text-5xl font-light text-white leading-tight mb-2">
                        Smart <span className="font-bold text-green-400">Solutions</span>
                    </h1>
                    <h2 className="text-4xl text-white font-thin">
                        Modern <span className="font-medium">Farmers</span>
                    </h2>
                    <p className="text-gray-300 mt-4 text-sm max-w-[280px] leading-relaxed">
                        Empowering farmers with smart tools for better yields and dat-driven decisions.
                    </p>
                </motion.div>

                {/* Action Button (Slide to start style) */}
                <motion.div variants={itemVariants}>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            console.log("Get Started Clicked");
                            onLogin();
                        }}
                        className="group w-full bg-white/10 backdrop-blur-md border border-white/20 h-16 rounded-[2rem] flex items-center justify-between px-2 pl-6 mb-4 shadow-xl"
                    >
                        <span className="text-white font-medium tracking-wide">Get Started</span>
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center group-hover:bg-green-400 transition-colors shadow-inner">
                            <ChevronRight size={24} className="text-black group-hover:text-white transition-colors" />
                        </div>
                    </motion.button>
                </motion.div>

                {/* Language & Guest */}
                <motion.div variants={itemVariants} className="flex justify-between items-center px-2 pt-2">
                    <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onLangChange(currentLang === 'en' ? 'hi' : 'en')} 
                        className="text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                    >
                        {currentLang === 'en' ? 'English' : 'हिंदी'}
                    </motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onBrowse} 
                        className="text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                    >
                        Guest Mode
                    </motion.button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default LandingScreen;
