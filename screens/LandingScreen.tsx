import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { ChevronRight, ArrowRight, Globe, Leaf, Sprout, Satellite, BrainCircuit, Coins, Shield, Zap, Users, Award, TrendingUp, Star } from 'lucide-react';
import { languages } from '../translations';
import FoundationPrimitives, { FoundationItem } from '../components/ui/foundation-primitives';

interface LandingScreenProps {
  onLogin: () => void;
  onBrowse: () => void;
  onAdminLogin: () => void;
  currentLang: Language;
  onLangChange: (lang: Language) => void;
}

// Animated stat number
const StatNumber = ({ value, label, prefix = '', suffix = '' }: { value: number; label: string; prefix?: string; suffix?: string }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 2000;
    const step = (value / duration) * 16;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, value);
      setCount(Math.floor(current));
      if (current >= value) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return (
    <div className="text-center">
      <p className="text-2xl font-black text-white">{prefix}{count.toLocaleString()}{suffix}</p>
      <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mt-0.5">{label}</p>
    </div>
  );
};

const FEATURES = [
  {
    icon: '🛰',
    title: 'Satellite Monitoring',
    desc: 'Real-time NDVI · NDMI · EVI for every acre',
    gradient: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)',
    glow: '#3B82F6',
  },
  {
    icon: '🤖',
    title: 'AI Disease Doctor',
    desc: 'Gemini Vision · 95% accuracy · Instant treatment',
    gradient: 'linear-gradient(135deg, #2D1B69, #7C3AED)',
    glow: '#8B5CF6',
  },
  {
    icon: '🌿',
    title: 'Carbon Credits',
    desc: 'Earn ₹2,400/acre · CBAM compliant · Blockchain verified',
    gradient: 'linear-gradient(135deg, #052E16, #16A34A)',
    glow: '#22C55E',
  },
  {
    icon: '📊',
    title: 'Market Intelligence',
    desc: 'Live mandi prices · Demand forecast · Best sell time',
    gradient: 'linear-gradient(135deg, #431407, #EA580C)',
    glow: '#F97316',
  },
];

const LandingScreen: React.FC<LandingScreenProps> = ({ onLogin, onBrowse, onAdminLogin, currentLang, onLangChange }) => {
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  // Auto-rotate features
  useEffect(() => {
    const timer = setInterval(() => setActiveFeature(p => (p + 1) % FEATURES.length), 3000);
    return () => clearInterval(timer);
  }, []);

  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const rise = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 22 } },
  };

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(165deg, #020B06 0%, #031208 30%, #041A0E 60%, #03100A 100%)' }}>

      {/* ════ ANIMATED BACKGROUND ════ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Aurora green */}
        <motion.div animate={{ x: [0,40,0], y: [0,-30,0], scale: [1,1.2,1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #00FF87, transparent 70%)' }} />

        {/* Aurora gold */}
        <motion.div animate={{ x: [0,-30,0], y: [0,40,0], scale: [1.2,1,1.2] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #FFB800, transparent 70%)' }} />

        {/* Aurora blue */}
        <motion.div animate={{ x: [0,20,0], y: [0,-20,0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          className="absolute top-1/3 right-0 w-64 h-64 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #00D4FF, transparent 70%)' }} />

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div key={i}
            animate={{ y: [0, -20, 0], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 4 + i * 0.7, repeat: Infinity, delay: i * 0.8 }}
            className="absolute rounded-full"
            style={{
              width: 4 + i * 2,
              height: 4 + i * 2,
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 20}%`,
              background: ['#00FF87', '#FFB800', '#00D4FF', '#FF6B6B', '#A78BFA', '#34D399'][i],
              boxShadow: `0 0 10px 2px ${['#00FF87', '#FFB800', '#00D4FF', '#FF6B6B', '#A78BFA', '#34D399'][i]}80`,
            }} />
        ))}

        {/* Orbiting rings */}
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute top-8 right-8 w-40 h-40 rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(52,211,153,0.15)' }}>
          <div className="absolute top-2 left-1/2 w-2.5 h-2.5 -translate-x-1/2 rounded-full"
            style={{ background: '#34D399', boxShadow: '0 0 12px 4px rgba(52,211,153,0.6)' }} />
        </motion.div>
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          className="absolute top-16 right-16 w-24 h-24 rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(251,191,36,0.15)' }}>
          <div className="absolute bottom-1 right-2 w-2 h-2 rounded-full"
            style={{ background: '#FBBF24', boxShadow: '0 0 10px 3px rgba(251,191,36,0.6)' }} />
        </motion.div>
      </div>

      {/* ════ HEADER ════ */}
      <div className="relative z-20 flex justify-between items-center px-5 pt-12 pb-2">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00FF87, #00BB78)', boxShadow: '0 0 20px rgba(0,255,135,0.4)' }}>
            <span className="text-lg">🌱</span>
          </div>
          <div>
            <h2 className="text-base font-black text-white leading-none tracking-tight">Krishi Drishti</h2>
            <p className="text-[9px] text-emerald-400/70 font-bold uppercase tracking-widest">Smart Farm Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language picker */}
          <div className="relative">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowLangPicker(!showLangPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 text-xs font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
              <Globe size={12} />
              {languages.find(l => l.code === currentLang)?.native || 'EN'}
            </motion.button>
            <AnimatePresence>
              {showLangPicker && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60]" onClick={() => setShowLangPicker(false)} />
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="absolute top-full mt-2 right-0 rounded-2xl shadow-2xl border border-white/10 p-1.5 z-[70] w-44 max-h-64 overflow-y-auto no-scrollbar"
                    style={{ background: 'rgba(10,20,15,0.95)', backdropFilter: 'blur(20px)' }}>
                    {languages.map((lang: any) => (
                      <button key={lang.code}
                        onClick={() => { onLangChange(lang.code as Language); setShowLangPicker(false); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex justify-between items-center mb-0.5 transition-all ${currentLang === lang.code ? 'text-emerald-300' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        style={currentLang === lang.code ? { background: 'rgba(0,255,135,0.1)' } : {}}>
                        <div>
                          <span className="block">{lang.label}</span>
                          <span className="text-[9px] opacity-60">{lang.native}</span>
                        </div>
                        {currentLang === lang.code && <span className="text-emerald-400">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Admin */}
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => {
              const token = window.prompt('Enter Ops Dashboard Token:');
              if (token === import.meta.env.VITE_ADMIN_SECRET_TOKEN) onAdminLogin();
              else if (token) alert('Invalid Token.');
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-white/15 text-white/40"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            🔒
          </motion.button>
        </div>
      </div>

      {/* ════ HERO CONTENT ════ */}
      <motion.div variants={stagger} initial="hidden" animate="show"
        className="relative z-20 flex flex-col px-5 pt-6 pb-2 flex-1">

        {/* Badge */}
        <motion.div variants={rise} className="flex justify-center mb-5">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.2)' }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">India's #1 AgriTech Platform</span>
          </div>
        </motion.div>

        {/* Main heading */}
        <motion.div variants={rise} className="text-center mb-4">
          <h1 className="text-[32px] font-black leading-[1.1] tracking-tight text-white">
            Your Farm,{' '}
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #00FF87, #00BB78, #34D399)' }}>
              Smarter
            </span>
            {' '}Than{' '}
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #FFB800, #F97316)' }}>
              Ever
            </span>
          </h1>
          <p className="text-sm text-white/50 font-medium mt-3 leading-relaxed max-w-xs mx-auto">
            AI-powered crop monitoring, disease detection & carbon credits — all in one app
          </p>
        </motion.div>

        {/* 3D WebGL Hero Visual */}
        <motion.div variants={rise} className="mb-4 -mx-2">
          <FoundationPrimitives
            height="clamp(140px,35vw,190px)"
            idle
            lens
            interactive
            shadow={0.6}
            glow={0.7}
            items={[
              { label: 'Crop Health', shape: 'sphere',    colors: ['#00BB78','#a7f3d0'], tile: 'disc'   },
              { label: 'AI Doctor',   shape: 'asterisk',  colors: ['#7c3aed','#ddd6fe'], tile: 'square' },
              { label: 'Soil Data',   shape: 'hourglass', colors: ['#d97706','#fde68a'], tile: 'square' },
              { label: 'Weather',     shape: 'torus',     colors: ['#0ea5e9','#bae6fd'], tile: 'square' },
              { label: 'Carbon',      shape: 'pill',      colors: ['#059669','#6ee7b7'], tile: 'none'   },
            ] as FoundationItem[]}
            className="text-white"
          />
          <div className="flex justify-center gap-4 mt-2">
            {['🌿 Crop','🤖 AI','🌍 Soil','🌤 Weather','♻️ Carbon'].map((lbl,i) => (
              <span key={i} className="text-[9px] font-bold text-white/30 uppercase tracking-wider">{lbl}</span>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={rise}
          className="flex justify-around py-4 px-3 rounded-2xl mb-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <StatNumber value={50000} suffix="+" label="Farmers" />
          <div className="w-px bg-white/10" />
          <StatNumber value={2400} prefix="₹" suffix="/acre" label="Carbon Earned" />
          <div className="w-px bg-white/10" />
          <StatNumber value={95} suffix="%" label="AI Accuracy" />
        </motion.div>

        {/* Feature carousel */}
        <motion.div variants={rise} className="mb-5">
          <div className="relative rounded-2xl overflow-hidden" style={{ height: 110 }}>
            <AnimatePresence mode="wait">
              <motion.div key={activeFeature}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="absolute inset-0 flex items-center gap-4 p-5"
                style={{ background: FEATURES[activeFeature].gradient, boxShadow: `0 0 40px ${FEATURES[activeFeature].glow}40` }}>
                {/* Glow */}
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: 'radial-gradient(circle at top right, white, transparent 60%)' }} />
                <span className="text-4xl flex-shrink-0 relative z-10">{FEATURES[activeFeature].icon}</span>
                <div className="relative z-10">
                  <p className="text-sm font-black text-white">{FEATURES[activeFeature].title}</p>
                  <p className="text-[11px] text-white/60 mt-1 leading-relaxed">{FEATURES[activeFeature].desc}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-2.5">
            {FEATURES.map((_, i) => (
              <button key={i} onClick={() => setActiveFeature(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: i === activeFeature ? 20 : 6, background: i === activeFeature ? '#00FF87' : 'rgba(255,255,255,0.2)' }} />
            ))}
          </div>
        </motion.div>

        {/* Mini feature pills */}
        <motion.div variants={rise} className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
          {[
            { icon: '🛰', label: 'Satellite' },
            { icon: '🤖', label: 'AI Doctor' },
            { icon: '🌿', label: 'Carbon' },
            { icon: '📊', label: 'Market' },
            { icon: '🎙', label: 'Voice AI' },
            { icon: '🗺', label: 'Farm Map' },
          ].map((f, i) => (
            <div key={i} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-base">{f.icon}</span>
              <span className="text-[10px] font-bold text-white/70 whitespace-nowrap">{f.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Trust badges */}
        <motion.div variants={rise} className="flex justify-center gap-4 mb-4">
          {[
            { icon: <Shield size={11} className="text-emerald-400" />, label: 'Govt Certified' },
            { icon: <Award size={11} className="text-amber-400" />, label: 'CBAM Ready' },
            { icon: <Star size={11} className="text-purple-400" />, label: 'ISO 27001' },
          ].map((badge, i) => (
            <div key={i} className="flex items-center gap-1">
              {badge.icon}
              <span className="text-[9px] font-bold text-white/40">{badge.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ════ CTA SECTION ════ */}
      <div className="relative z-20 px-5 pb-10 space-y-3">
        {/* Primary CTA */}
        <motion.button
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, type: 'spring' }}
          whileTap={{ scale: 0.97 }}
          onClick={onLogin}
          className="relative w-full py-4 rounded-2xl overflow-hidden flex items-center justify-center gap-2.5 font-black text-base"
          style={{
            background: 'linear-gradient(135deg, #00FF87 0%, #00BB78 50%, #059669 100%)',
            color: '#001A0E',
            boxShadow: '0 12px 40px rgba(0,255,135,0.35), 0 4px 12px rgba(0,0,0,0.2)',
          }}>
          {/* Shimmer */}
          <motion.div animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
            className="absolute inset-0 skew-x-12 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }} />
          <span className="relative z-10 text-lg">📱</span>
          <span className="relative z-10">Login with Mobile OTP</span>
          <ArrowRight size={18} className="relative z-10" />
        </motion.button>

        {/* Secondary CTA */}
        <motion.button
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
          whileTap={{ scale: 0.97 }}
          onClick={onBrowse}
          className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
          }}>
          <span>Explore as Guest</span>
          <ChevronRight size={15} />
        </motion.button>

        {/* Divider with social proof */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          className="flex items-center justify-center gap-2 py-1">
          <div className="flex -space-x-2">
            {['🧑‍🌾', '👩‍🌾', '🧑‍🌾'].map((e, i) => (
              <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
                {e}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/40 font-semibold">50,000+ farmers trust us</p>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingScreen;
