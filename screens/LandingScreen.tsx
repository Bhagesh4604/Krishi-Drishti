import React from 'react';
import { ChevronRight, Leaf, Lock, Sprout, Satellite, BrainCircuit, Coins } from 'lucide-react';
import { Language } from '../types';
import { motion } from 'framer-motion';
import Tilt3D from '../components/Tilt3D';
import AuroraBackdrop from '../components/AuroraBackdrop';

interface LandingScreenProps {
    onLogin: () => void;
    onBrowse: () => void;
    onAdminLogin: () => void;
    currentLang: Language;
    onLangChange: (lang: Language) => void;
}

const FEATURES = [
    { icon: <Satellite size={16} />, title: 'Satellite Fields', desc: 'Live NDVI crop health', tilt: '-6deg' },
    { icon: <BrainCircuit size={16} />, title: 'AI Diagnosis', desc: 'Scan · Detect · Treat', tilt: '4deg' },
    { icon: <Coins size={16} />, title: 'Carbon Credits', desc: 'Earn from green farming', tilt: '-3deg' },
];

const LandingScreen: React.FC<LandingScreenProps> = ({ onLogin, onBrowse, onAdminLogin, currentLang, onLangChange }) => {
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.18, delayChildren: 0.25 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <div className="relative h-full w-full flex flex-col justify-end pb-10 overflow-hidden" style={{ background: 'linear-gradient(165deg, #041c10 0%, #07291a 45%, #0d3b26 100%)', perspective: '1200px' }}>
            {/* Animated aurora light field */}
            <AuroraBackdrop variant="dark" />

            {/* Background Image — Ken Burns zoom, masked into the scene */}
            <motion.div
                initial={{ scale: 1.0 }}
                animate={{ scale: 1.12, y: -8 }}
                transition={{ duration: 24, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
                className="absolute inset-0 z-0 opacity-40"
                style={{
                    backgroundImage: 'url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1932&auto=format&fit=crop)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    maskImage: 'linear-gradient(to top, transparent 8%, black 60%)',
                    WebkitMaskImage: 'linear-gradient(to top, transparent 8%, black 60%)',
                }}
            />

            {/* Orbiting decorative rings — pure 3D ambience */}
            <div className="absolute -top-28 -right-28 w-80 h-80 rounded-full border border-emerald-400/20 animate-spin-slow z-0 pointer-events-none">
                <div className="absolute top-6 left-10 w-3 h-3 rounded-full bg-emerald-400/70 shadow-[0_0_16px_4px_rgba(52,211,153,0.6)]" />
                <div className="absolute bottom-10 right-8 w-2 h-2 rounded-full bg-amber-400/70 shadow-[0_0_12px_3px_rgba(251,191,36,0.55)]" />
            </div>
            <div className="absolute top-10 -left-24 w-56 h-56 rounded-full border border-teal-300/15 animate-spin-slow z-0 pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '32s' }}>
                <div className="absolute top-4 right-8 w-2.5 h-2.5 rounded-full bg-teal-300/70 shadow-[0_0_14px_4px_rgba(94,234,212,0.5)]" />
            </div>

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

            {/* ══ Floating 3D Feature Cards ══ */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-24 left-0 right-0 z-20 px-8 flex flex-col gap-3 pointer-events-none"
                style={{ transformStyle: 'preserve-3d' }}
            >
                {FEATURES.map((f, i) => (
                    <div key={i} className="pointer-events-auto self-stretch" style={{ transform: `rotateX(14deg) rotateZ(${f.tilt}) translateY(${i * 4}px)` }}>
                        <Tilt3D maxTilt={8} className="rounded-2xl">
                            <div className="glass-dark rounded-2xl px-4 py-3 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                                    style={{ background: 'linear-gradient(140deg, #34d399, #059669)', boxShadow: '0 4px 12px rgba(0,187,120,0.45), inset 0 1px 0 rgba(255,255,255,0.4)' }}>
                                    {f.icon}
                                </div>
                                <div>
                                    <p className="text-[12px] font-bold text-white leading-tight">{f.title}</p>
                                    <p className="text-[10px] text-emerald-200/70">{f.desc}</p>
                                </div>
                            </div>
                        </Tilt3D>
                    </div>
                ))}
            </motion.div>

            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent z-10 pointer-events-none" />

            {/* Content Container */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="relative z-20 px-8 w-full"
            >
                {/* Logo / Badge */}
                <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
                    <motion.div
                        animate={{ y: [0, -6, 0], rotate: [0, 4, -4, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                        style={{
                            background: 'linear-gradient(140deg, #4ade80, #00BB78 55%, #047857)',
                            boxShadow: '0 8px 24px rgba(0,187,120,0.5), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
                        }}
                    >
                        <Leaf size={22} fill="currentColor" />
                    </motion.div>
                    <div>
                        <span className="text-white font-extrabold text-xl tracking-wide block leading-none">Krishi <span className="text-gradient-gold">Drishti</span></span>
                        <span className="text-emerald-300/70 text-[10px] font-bold uppercase tracking-[0.25em]">Agri Vision 3D</span>
                    </div>
                </motion.div>

                {/* Main Typography */}
                <motion.div variants={itemVariants} className="mb-8">
                    <h1 className="text-[2.6rem] font-light text-white leading-[1.05] mb-1">
                        Smart <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-lime-300 drop-shadow-[0_0_18px_rgba(52,211,153,0.45)]">Solutions</span>
                    </h1>
                    <h2 className="text-3xl text-white/90 font-thin">
                        for <span className="font-semibold text-white">Modern Farmers</span>
                    </h2>
                    <p className="text-gray-300 mt-4 text-sm max-w-[290px] leading-relaxed">
                        Empowering farmers with satellite insights, AI diagnostics and carbon rewards — for better yields and data-driven decisions.
                    </p>
                </motion.div>

                {/* Action Button — glossy 3D CTA */}
                <motion.div variants={itemVariants}>
                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                            console.log("Get Started Clicked");
                            onLogin();
                        }}
                        className="group relative w-full h-16 rounded-[2rem] flex items-center justify-between px-2 pl-6 mb-4 overflow-hidden border border-white/25"
                        style={{
                            background: 'linear-gradient(150deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 0 40px rgba(0,187,120,0.18), inset 0 1px 0 rgba(255,255,255,0.3)',
                        }}
                    >
                        {/* inner glow sweep */}
                        <motion.span
                            animate={{ x: ['-120%', '220%'] }}
                            transition={{ duration: 3.2, repeat: Infinity, ease: 'linear', repeatDelay: 1.2 }}
                            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
                        />
                        <span className="text-white font-semibold tracking-wide relative z-10">Get Started</span>
                        <div className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all group-hover:scale-110"
                            style={{
                                background: 'linear-gradient(140deg, #4ade80, #00BB78)',
                                boxShadow: '0 6px 18px rgba(0,187,120,0.55), inset 0 1px 0 rgba(255,255,255,0.5)',
                            }}>
                            <ChevronRight size={24} className="text-white" />
                        </div>
                    </motion.button>
                </motion.div>

                {/* Language & Guest */}
                <motion.div variants={itemVariants} className="flex justify-between items-center px-2 pt-2">
                    <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onLangChange(currentLang === 'en' ? 'hi' : 'en')}
                        className="flex items-center gap-1.5 text-white/60 text-xs font-bold uppercase tracking-widest hover:text-emerald-300 transition-colors"
                    >
                        <Sprout size={12} />
                        {currentLang === 'en' ? 'English' : 'हिंदी'}
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onBrowse}
                        className="text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                    >
                        Guest Mode →
                    </motion.button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default LandingScreen;
