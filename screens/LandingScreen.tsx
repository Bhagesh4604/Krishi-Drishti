import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Language } from '../types';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { 
  ChevronRight, ArrowRight, Globe, Leaf, Sprout, Satellite, 
  BrainCircuit, Coins, Shield, Zap, Users, Award, TrendingUp, Star,
  Droplet, Wind, Sun, Activity
} from 'lucide-react';
import { languages } from '../translations';

interface LandingScreenProps {
  onLogin: () => void;
  onBrowse: () => void;
  onAdminLogin: () => void;
  currentLang: Language;
  onLangChange: (lang: Language) => void;
}

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────

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
    <div className="flex flex-col items-center">
      <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300 drop-shadow-[0_0_15px_rgba(0,255,135,0.5)]">
        {prefix}{count.toLocaleString()}{suffix}
      </span>
      <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">{label}</span>
    </div>
  );
};

function TiltCard({ children, className = "", tiltFactor = 15 }: { children: React.ReactNode; className?: string; tiltFactor?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [tiltFactor, -tiltFactor]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-tiltFactor, tiltFactor]);
  const sX = useSpring(rotateX, { stiffness: 400, damping: 30 });
  const sY = useSpring(rotateY, { stiffness: 400, damping: 30 });

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    x.set((clientX - r.left) / r.width - 0.5);
    y.set((clientY - r.top) / r.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onTouchMove={onMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      onTouchEnd={() => { x.set(0); y.set(0); }}
      style={{ rotateX: sX, rotateY: sY, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Complex 3D Particle Field
function QuantumField() {
  const particles = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    z: Math.random() * 200 - 100,
    size: Math.random() * 3 + 1,
    color: ['#00FF87', '#00D4FF', '#c77dff', '#FFB800'][Math.floor(Math.random() * 4)],
    duration: Math.random() * 20 + 10,
    delay: Math.random() * -30,
  })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ perspective: '1000px' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size,
            background: p.color, boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            transform: `translateZ(${p.z}px)`
          }}
          animate={{
            y: ['-20vh', '120vh'],
            x: [0, Math.random() * 100 - 50, 0],
            rotateZ: [0, 360]
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

// 3D Hologram Logo
function HologramLogo() {
  return (
    <div className="relative w-40 h-40 mx-auto flex items-center justify-center transform-gpu" style={{ transformStyle: 'preserve-3d' }}>
      {/* Base glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl opacity-40"
        style={{ background: 'radial-gradient(circle, #00FF87 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Rotating rings */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border border-emerald-400/30"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{
            rotateX: [0, 360],
            rotateY: [0, 360],
            rotateZ: [0, 360]
          }}
          transition={{
            duration: 10 + i * 5,
            repeat: Infinity,
            ease: "linear",
            delay: i * -2
          }}
        />
      ))}

      {/* Center Sphere */}
      <motion.div
        className="relative w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0,255,135,0.4), rgba(0,212,255,0.4))',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,255,135,0.5)',
          boxShadow: '0 0 40px rgba(0,255,135,0.4), inset 0 0 20px rgba(255,255,255,0.5)'
        }}
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <Leaf size={36} className="text-white drop-shadow-[0_0_10px_#00FF87]" style={{ transform: 'translateZ(20px)' }} />
      </motion.div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const LandingScreen: React.FC<LandingScreenProps> = ({ onLogin, onBrowse, onAdminLogin, currentLang, onLangChange }) => {
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  const FEATURES = [
    { id: 'ai', icon: BrainCircuit, title: 'AI Disease Doctor', desc: 'Instant diagnosis with Gemini Vision model. 98% accuracy on 40+ crops.', color: '#c77dff', bg: 'rgba(199,125,255,0.1)' },
    { id: 'sat', icon: Satellite, title: 'Satellite Analytics', desc: 'Real-time NDVI & NDMI moisture mapping powered by Google Earth Engine.', color: '#00d4ff', bg: 'rgba(0,212,255,0.1)' },
    { id: 'carb', icon: Leaf, title: 'Carbon Credits', desc: 'Earn verified carbon credits for sustainable farming. CBAM compliant.', color: '#00ff87', bg: 'rgba(0,255,135,0.1)' },
    { id: 'mkt', icon: TrendingUp, title: 'Live Marketplace', desc: 'Predictive pricing and direct-to-buyer smart contracts.', color: '#ffd93d', bg: 'rgba(255,217,61,0.1)' },
  ];

  useEffect(() => {
    const timer = setInterval(() => setActiveFeature(p => (p + 1) % FEATURES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } };
  const rise = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden font-sans"
      style={{ background: 'linear-gradient(180deg, #010604 0%, #021208 40%, #031c10 100%)' }}>
      
      <QuantumField />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '32px 32px', transform: 'perspective(500px) rotateX(60deg) scale(2.5) translateY(10%)' }} />

      {/* ── HEADER ── */}
      <header className="relative z-50 flex justify-between items-center px-6 pt-12 pb-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-[0_0_20px_rgba(0,255,135,0.4)]">
            <Sprout size={20} className="text-black" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-none tracking-tight">Krishi-Drishti</h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5">Next-Gen AgriTech</p>
          </div>
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowLangPicker(!showLangPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-white bg-white/5 backdrop-blur-md">
              <Globe size={14} className="text-emerald-400" />
              {languages.find(l => l.code === currentLang)?.native || 'EN'}
            </motion.button>
            <AnimatePresence>
              {showLangPicker && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute top-full right-0 mt-2 w-48 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 p-2 z-50 shadow-2xl max-h-[60vh] overflow-y-auto">
                    {languages.map((lang) => (
                      <button key={lang.code} onClick={() => { onLangChange(lang.code as Language); setShowLangPicker(false); }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex justify-between items-center mb-1 transition-all ${currentLang === lang.code ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/70 hover:bg-white/10'}`}>
                        <div><span className="block">{lang.label}</span><span className="text-[10px] opacity-60 font-medium">{lang.native}</span></div>
                        {currentLang === lang.code && <motion.div layoutId="check" className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#00ff87]" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <motion.button whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }} onClick={() => {
              const token = window.prompt('Enter Admin/Ops Token:');
              if (token === import.meta.env.VITE_ADMIN_SECRET_TOKEN) onAdminLogin();
              else if (token) alert('Invalid Token.');
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-white/10 backdrop-blur-md text-white/50 hover:text-emerald-400 transition-colors">
            <Shield size={16} />
          </motion.button>
        </div>
      </header>

      {/* ── SCROLLABLE BODY ── */}
      <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar pb-32">
        <motion.div variants={stagger} initial="hidden" animate="show" className="px-6 pt-4 flex flex-col items-center">
          
          {/* Hologram Graphic */}
          <motion.div variants={rise} className="mb-8 w-full max-w-sm">
            <HologramLogo />
          </motion.div>

          {/* Hero Typography */}
          <motion.div variants={rise} className="text-center mb-10 w-full">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Platform Live in 18 States</span>
            </div>
            
            <h1 className="text-[40px] leading-[1.1] font-black text-white tracking-tight mb-4">
              Farming,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500">
                Reimagined
              </span>
            </h1>
            <p className="text-[15px] text-white/60 font-medium leading-relaxed max-w-sm mx-auto">
              Empowering farmers with AI diagnostics, satellite crop monitoring, and automated carbon credit generation.
            </p>
          </motion.div>

          {/* Core Stats */}
          <motion.div variants={rise} className="w-full grid grid-cols-3 gap-3 mb-10">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl py-4 flex flex-col items-center justify-center">
              <StatNumber value={12847} label="Active Nodes" />
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl py-4 flex flex-col items-center justify-center">
              <StatNumber value={98} suffix="%" label="AI Accuracy" />
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl py-4 flex flex-col items-center justify-center">
              <StatNumber value={2400} prefix="₹" label="Avg Credits" />
            </div>
          </motion.div>

          {/* 3D Feature Carousel */}
          <motion.div variants={rise} className="w-full mb-10">
            <h3 className="text-xs font-black text-white/40 uppercase tracking-widest text-center mb-4">Platform Capabilities</h3>
            <div className="relative h-44 w-full perspective-[1000px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, rotateX: 45, y: 50, scale: 0.8 }}
                  animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
                  exit={{ opacity: 0, rotateX: -45, y: -50, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute inset-0"
                >
                  <TiltCard className="h-full w-full">
                    <div className="h-full w-full rounded-3xl p-6 flex flex-col justify-between"
                      style={{ background: FEATURES[activeFeature].bg, border: `1px solid ${FEATURES[activeFeature].color}40`, backdropFilter: 'blur(20px)', boxShadow: `0 10px 40px ${FEATURES[activeFeature].color}20` }}>
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${FEATURES[activeFeature].color}20` }}>
                          {React.createElement(FEATURES[activeFeature].icon, { size: 24, color: FEATURES[activeFeature].color })}
                        </div>
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
                          <Activity size={16} color={FEATURES[activeFeature].color} />
                        </motion.div>
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white mb-2">{FEATURES[activeFeature].title}</h4>
                        <p className="text-xs text-white/70 leading-relaxed font-medium">{FEATURES[activeFeature].desc}</p>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Carousel Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {FEATURES.map((f, i) => (
                <button key={i} onClick={() => setActiveFeature(i)}
                  className="h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: i === activeFeature ? 24 : 8, background: i === activeFeature ? f.color : 'rgba(255,255,255,0.2)' }} />
              ))}
            </div>
          </motion.div>

          {/* Floating Integration Pills */}
          <motion.div variants={rise} className="w-full mb-10 overflow-hidden">
            <h3 className="text-xs font-black text-white/40 uppercase tracking-widest text-center mb-4">Powered By</h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 px-2 -mx-2 mask-edges">
              {[
                { icon: BrainCircuit, name: 'Gemini 2.5 Flash', color: '#c77dff' },
                { icon: Globe, name: 'Google Earth Engine', color: '#00d4ff' },
                { icon: Droplet, name: 'OpenWeather API', color: '#ffd93d' },
                { icon: Database, name: 'Redis Cache', color: '#ff6b6b' },
              ].map((tech, i) => (
                <div key={i} className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <tech.icon size={14} color={tech.color} />
                  <span className="text-[11px] font-bold text-white/80">{tech.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* ── BOTTOM STICKY CTA ── */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-50 bg-gradient-to-t from-black via-black/90 to-transparent pt-12">
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, type: "spring", damping: 20 }} className="space-y-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onLogin}
            className="relative w-full py-4 rounded-2xl overflow-hidden flex items-center justify-center gap-3 font-black text-lg group"
            style={{ background: 'linear-gradient(135deg, #00FF87, #00d4ff)', boxShadow: '0 0 30px rgba(0,255,135,0.3)' }}
          >
            <motion.div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="text-black relative z-10 flex items-center gap-2">
              <Zap size={20} /> Access Platform <ArrowRight size={20} />
            </span>
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBrowse}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md"
          >
            Explore as Guest <ChevronRight size={16} />
          </motion.button>
        </motion.div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-edges { -webkit-mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent); mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent); }
      `}</style>
    </div>
  );
};

export default LandingScreen;
