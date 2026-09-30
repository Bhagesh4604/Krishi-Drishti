import React, { useState, useEffect, useRef } from 'react';
import { Screen, UserProfile, Language } from '../types';
import { languages } from '../translations';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  MapPin, Bell, Thermometer, Droplets, Wind, CloudRain, Leaf,
  Home, Sprout, Zap, Landmark, Radio, ScrollText, Activity,
  Calendar, Bot, Umbrella, TrendingUp, ScanLine, BookOpen,
  Coins, ArrowRight, MessageCircle, Sun, Plus, Link2,
  Building2, ChevronRight, BarChart2, Search, Grid3x3,
  Satellite, Brain, Shield, Flame, Star, Globe2, Wheat,
  AreaChart, Award, AlertCircle, CheckCircle2, ArrowUpRight,
  Cloud, CloudSun, DropletIcon, Crop
} from 'lucide-react';
import { weatherService } from '../src/services/api';
import WeatherModal from '../components/WeatherModal';
import CarbonWalletCard from '../components/CarbonWalletCard';
import { plotService } from '../src/services/api';

interface DashboardScreenProps {
  navigateTo: (screen: Screen) => void;
  user: UserProfile | null;
  t: any;
  onLangChange: (lang: Language) => void;
  currentLang: Language;
  weather: any;
  locationName: string;
}

// Animated number counter
const AnimatedCounter = ({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 30;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 40);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

// Pulse indicator
const PulseDot = ({ color = '#00BB78' }: { color?: string }) => (
  <span className="relative inline-flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
  </span>
);

const getCropImage = (crop: string) => {
  const map: any = {
    'Wheat': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80',
    'Corn': 'https://images.unsplash.com/photo-1601593346740-925612772716?w=400&q=80',
    'Rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80',
    'Potato': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80',
    'Tomato': 'https://images.unsplash.com/photo-1561136594-7f68807a8d35?w=400&q=80',
    'Cotton': 'https://images.unsplash.com/photo-1565108754993-f1e4cec2f5e9?w=400&q=80',
    'Sugarcane': 'https://images.unsplash.com/photo-1559181567-c3190ca9be46?w=400&q=80',
  };
  return map[crop] || 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80';
};

const fieldImages = [
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80',
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80',
  'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&q=80',
];

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigateTo, user, t, onLangChange, currentLang, weather, locationName }) => {
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [userPlots, setUserPlots] = useState<any[]>([]);
  const [isLoadingPlots, setIsLoadingPlots] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<any[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts'>('overview');
  const citySearchTimer = useRef<any>(null);
  const hasFetched = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    const fetchPlots = async () => {
      try {
        const data = await plotService.getPlots();
        setUserPlots(data);
      } catch (e) { console.error(e); }
      finally { setIsLoadingPlots(false); }
    };
    fetchPlots();
  }, []);

  const handleCitySearch = (q: string) => {
    setCityQuery(q);
    clearTimeout(citySearchTimer.current);
    if (!q.trim()) { setCityResults([]); return; }
    citySearchTimer.current = setTimeout(async () => {
      setCitySearching(true);
      try { const r = await weatherService.searchCity(q); setCityResults(r || []); }
      catch { setCityResults([]); }
      finally { setCitySearching(false); }
    }, 400);
  };

  const handlePickCity = (city: any) => {
    localStorage.setItem('kd_saved_location', JSON.stringify({ lat: city.latitude, lng: city.longitude, name: `${city.name}, ${city.country}` }));
    sessionStorage.removeItem('kd_last_location');
    setShowLocationPicker(false);
    window.location.reload();
  };

  const currentTemp = weather?.current?.temperature_2m ? Math.round(weather.current.temperature_2m) : 28;
  const humidity = weather?.current?.relative_humidity_2m ?? 65;
  const windSpeed = weather?.current?.wind_speed_10m ?? 12;
  const precipitation = weather?.current?.precipitation ?? 0;
  const crops = (user?.crops && Array.isArray(user.crops) && user.crops.length > 0) ? user.crops : ['Wheat', 'Rice'];

  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  // NDVI Health score mock
  const ndviScore = 82;
  const soilMoisture = 71;

  return (
    <div className="min-h-full bg-[#F0FBF5] font-sans relative overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ════════════════════════════ HERO HEADER ════════════════════════════ */}
      <div className="relative overflow-hidden" style={{
        background: 'linear-gradient(160deg, #011C0E 0%, #022D18 40%, #044726 80%, #055A30 100%)',
        paddingBottom: '70px',
      }}>
        {/* Animated aurora blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ x: [0,30,0], y: [0,-20,0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #00FF87, transparent 70%)' }} />
          <motion.div animate={{ x: [0,-20,0], y: [0,25,0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute top-10 -right-10 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #FFB800, transparent 70%)' }} />
          <motion.div animate={{ scale: [1,1.2,1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #00D4FF, transparent 70%)' }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        {/* Header top row */}
        <div className="relative z-10 px-5 pt-12 pb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PulseDot color="#00FF87" />
              <span className="text-xs font-bold tracking-widest uppercase text-emerald-400/80">Live Dashboard</span>
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              नमस्ते, <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg, #6EE7B7, #34D399, #A7F3D0)' }}>
                {user?.name?.split(' ')[0] || 'Farmer'} 👋
              </span>
            </h1>
            <button onClick={() => setShowLocationPicker(true)}
              className="flex items-center gap-1.5 mt-1 hover:opacity-80 transition-opacity">
              <MapPin size={12} className="text-emerald-400" fill="currentColor" />
              <span className="text-xs font-semibold text-white/70">{locationName.split(',')[0]}</span>
              <span className="text-xs text-emerald-400">↓</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Language selector */}
            <div className="relative">
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="w-9 h-9 rounded-full flex items-center justify-center border border-white/20 text-xs font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                {currentLang.toUpperCase()}
              </motion.button>
              <AnimatePresence>
                {showLangMenu && (
                  <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[60]" onClick={() => setShowLangMenu(false)} />
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-[70] w-52 max-h-72 overflow-y-auto">
                      {languages.map((lang: any) => (
                        <button key={lang.code} onClick={() => { onLangChange(lang.code as Language); setShowLangMenu(false); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex justify-between items-center mb-0.5 transition-all ${currentLang === lang.code ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                          <div className="flex flex-col">
                            <span>{lang.label}</span>
                            <span className="text-[10px] text-gray-400 font-medium">{lang.native}</span>
                          </div>
                          {currentLang === lang.code && <CheckCircle2 size={14} className="text-emerald-500" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigateTo('corporate-dashboard')}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-white/20"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              <Building2 size={16} className="text-white/80" />
            </motion.button>

            <motion.button whileTap={{ scale: 0.9 }}
              className="relative w-9 h-9 rounded-full flex items-center justify-center border border-amber-400/40"
              style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1))' }}>
              <Bell size={16} className="text-amber-300" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#022D18] text-[8px] font-bold text-white flex items-center justify-center">3</span>
            </motion.button>
          </div>
        </div>

        {/* ── WEATHER HERO CARD ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="mx-5 relative z-10">
          <motion.div whileTap={{ scale: 0.98 }} onClick={() => setShowWeatherModal(true)}
            className="relative rounded-3xl overflow-hidden cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
            {/* Weather condition glow */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-30 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(255,220,100,0.6), transparent 70%)', transform: 'translate(30%, -30%)' }} />

            <div className="p-5 flex items-start justify-between">
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-6xl font-extralight text-white tabular-nums">{currentTemp}°</span>
                  <span className="text-2xl text-white/50 mb-3">C</span>
                </div>
                <p className="text-sm font-semibold text-white/80 mt-1">
                  {precipitation > 0 ? '🌧 Rainy' : currentTemp > 30 ? '☀️ Hot & Sunny' : '⛅ Pleasant'} · {locationName.split(',')[0]}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  {[
                    { icon: <Droplets size={13} />, val: `${humidity}%`, color: '#60A5FA' },
                    { icon: <Wind size={13} />, val: `${windSpeed} m/s`, color: '#A7F3D0' },
                    { icon: <CloudRain size={13} />, val: `${precipitation}mm`, color: '#818CF8' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1" style={{ color: item.color }}>
                      {item.icon}
                      <span className="text-xs font-bold text-white/80">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="text-5xl">☀️</motion.div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Tap for 7-day</div>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <span className="text-xs text-emerald-400 font-bold">Forecast</span>
                    <ArrowUpRight size={11} className="text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Mini forecast strip */}
            <div className="px-5 pb-4 pt-0">
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div key={day} className={`flex-shrink-0 flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl text-center ${i === 0 ? 'bg-white/20' : 'bg-white/8'}`}>
                    <span className="text-[9px] font-bold text-white/60">{day}</span>
                    <span className="text-sm">{['☀️','⛅','🌧','☀️','🌤','⛅','☀️'][i]}</span>
                    <span className="text-[10px] font-bold text-white/90">{currentTemp - 2 + i}°</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ════════════════ FARM HEALTH METRICS ════════════════ */}
      <div className="relative z-20 -mt-10 px-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'NDVI Score', value: ndviScore, unit: '%', icon: <Satellite size={16} />, color: '#10B981', bg: 'linear-gradient(135deg, #065F46, #059669)', status: 'Healthy' },
            { label: 'Soil Moisture', value: soilMoisture, unit: '%', icon: <Droplets size={16} />, color: '#3B82F6', bg: 'linear-gradient(135deg, #1E3A5F, #2563EB)', status: 'Optimal' },
            { label: 'Pest Risk', value: 'LOW', unit: '', icon: <Shield size={16} />, color: '#F59E0B', bg: 'linear-gradient(135deg, #451A03, #D97706)', status: 'Safe' },
          ].map((metric, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}
              className="rounded-2xl overflow-hidden relative"
              style={{ background: metric.bg, boxShadow: `0 8px 24px -4px ${metric.color}40` }}>
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle at top right, white, transparent 60%)' }} />
              <div className="p-3 relative z-10">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <span style={{ color: 'white' }}>{metric.icon}</span>
                </div>
                <div className="text-xl font-black text-white">
                  {typeof metric.value === 'number' ? <AnimatedCounter target={metric.value} suffix={metric.unit} /> : metric.value}
                </div>
                <div className="text-[9px] font-bold text-white/60 uppercase tracking-wider mt-0.5">{metric.label}</div>
                <div className="flex items-center gap-1 mt-1">
                  <PulseDot color="rgba(255,255,255,0.8)" />
                  <span className="text-[9px] text-white/70 font-semibold">{metric.status}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ════════════════ AI QUICK ACTIONS ════════════════ */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-gray-900">AI Tools</h2>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">✦ Powered by Gemini</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* AI CROP DOCTOR — featured */}
          <motion.div variants={fadeUp} whileTap={{ scale: 0.96 }}
            onClick={() => navigateTo('vision')}
            className="col-span-2 relative rounded-3xl overflow-hidden cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #0D0D0D 0%, #1A0A2E 50%, #0D1B2A 100%)',
              border: '1px solid rgba(139,92,246,0.3)',
              boxShadow: '0 16px 48px -8px rgba(139,92,246,0.3)',
            }}>
            <div className="absolute inset-0">
              <motion.div animate={{ x: [0,20,0], y: [0,-15,0] }} transition={{ duration: 8, repeat: Infinity }}
                className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-30"
                style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)', transform: 'translate(20%, -20%)' }} />
              <motion.div animate={{ x: [0,-15,0], y: [0,20,0] }} transition={{ duration: 10, repeat: Infinity, delay: 2 }}
                className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #EC4899, transparent 70%)' }} />
            </div>

            <div className="relative z-10 p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', boxShadow: '0 4px 12px rgba(124,58,237,0.5)' }}>
                    <Brain size={16} className="text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">AI Crop Doctor</span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight">Scan & Detect<br/>
                  <span className="text-transparent bg-clip-text"
                    style={{ backgroundImage: 'linear-gradient(90deg, #A78BFA, #F9A8D4)' }}>
                    Any Disease Instantly
                  </span>
                </h3>
                <p className="text-xs text-white/50 mt-1.5">Upload photo · Get diagnosis · Treatment plan</p>
                <motion.div whileHover={{ x: 3 }} className="flex items-center gap-1.5 mt-3">
                  <span className="text-xs font-bold text-purple-400">Scan Now</span>
                  <ArrowUpRight size={13} className="text-purple-400" />
                </motion.div>
              </div>
              <div className="text-6xl">🔬</div>
            </div>
          </motion.div>

          {/* AI Chat */}
          <motion.div variants={fadeUp} whileTap={{ scale: 0.96 }}
            onClick={() => navigateTo('chat')}
            className="relative rounded-2xl overflow-hidden cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #0C4A6E, #0284C7)', border: '1px solid rgba(56,189,248,0.3)', boxShadow: '0 10px 30px -5px rgba(2,132,199,0.4)' }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-30"
              style={{ background: 'radial-gradient(circle, white, transparent 70%)', transform: 'translate(40%, -40%)' }} />
            <div className="p-4 relative z-10">
              <div className="text-3xl mb-2">🤖</div>
              <p className="text-sm font-black text-white">AI Advisory</p>
              <p className="text-[10px] text-white/60 mt-0.5">Ask anything</p>
              <div className="mt-2 flex items-center gap-1">
                <PulseDot color="#7DD3FC" />
                <span className="text-[9px] text-sky-300 font-bold">Online</span>
              </div>
            </div>
          </motion.div>

          {/* Voice Assistant */}
          <motion.div variants={fadeUp} whileTap={{ scale: 0.96 }}
            onClick={() => navigateTo('live-audio')}
            className="relative rounded-2xl overflow-hidden cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #064E3B, #059669)', border: '1px solid rgba(52,211,153,0.3)', boxShadow: '0 10px 30px -5px rgba(5,150,105,0.4)' }}>
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <div className="flex gap-1 items-center h-full">
                {[...Array(8)].map((_, i) => (
                  <motion.div key={i} animate={{ scaleY: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                    className="w-1.5 rounded-full bg-white" style={{ height: '60%' }} />
                ))}
              </div>
            </div>
            <div className="p-4 relative z-10">
              <div className="text-3xl mb-2">🎙</div>
              <p className="text-sm font-black text-white">Voice AI</p>
              <p className="text-[10px] text-white/60 mt-0.5">Speak in Hindi</p>
              <div className="mt-2 flex items-center gap-1">
                <PulseDot color="#86EFAC" />
                <span className="text-[9px] text-emerald-300 font-bold">8 Languages</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ════════════════ SERVICES GRID ════════════════ */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-gray-900">Services</h2>
          <span className="text-xs text-gray-500 font-semibold">12 tools →</span>
        </div>

        {/* Featured 2-column cards */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            {
              title: 'Live Market', sub: 'Mandi prices now', icon: '📈', screen: 'market',
              bg: 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
              accent: '#F59E0B', border: 'rgba(245,158,11,0.3)',
              badge: 'LIVE',
            },
            {
              title: 'Carbon Vault', sub: 'Earn from farming', icon: '🌿', screen: 'carbon-vault',
              bg: 'linear-gradient(135deg, #052E16 0%, #14532D 100%)',
              accent: '#22C55E', border: 'rgba(34,197,94,0.3)',
              badge: '₹2,400',
            },
          ].map((card, i) => (
            <motion.div key={i} whileTap={{ scale: 0.96 }} onClick={() => navigateTo(card.screen as Screen)}
              className="rounded-2xl overflow-hidden cursor-pointer relative"
              style={{ background: card.bg, border: `1px solid ${card.border}`, minHeight: 130, boxShadow: `0 12px 32px -6px ${card.accent}30` }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20"
                style={{ background: `radial-gradient(circle, ${card.accent}, transparent 70%)`, transform: 'translate(30%, -30%)' }} />
              <div className="p-4 relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{card.icon}</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: `${card.accent}22`, color: card.accent, border: `1px solid ${card.accent}44` }}>
                    {card.badge}
                  </span>
                </div>
                <p className="text-sm font-black text-white leading-tight">{card.title}</p>
                <p className="text-[10px] mt-0.5" style={{ color: card.accent }}>{card.sub}</p>
                <div className="flex items-center gap-1 mt-3">
                  <ArrowRight size={12} style={{ color: card.accent }} />
                  <span className="text-[10px] font-bold" style={{ color: card.accent }}>Open</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 4-tile grid */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { icon: '🛡', label: 'Insurance', screen: 'insurance', color: '#60A5FA', bg: '#EFF6FF' },
            { icon: '🌱', label: 'Schemes', screen: 'scheme-setu', color: '#34D399', bg: '#ECFDF5' },
            { icon: '🗺', label: 'Farm Map', screen: 'map', color: '#A78BFA', bg: '#F5F3FF' },
            { icon: '🔬', label: 'Soil Lab', screen: 'soil-carbon', color: '#F97316', bg: '#FFF7ED' },
          ].map((item, i) => (
            <motion.div key={i} whileTap={{ scale: 0.92 }} onClick={() => navigateTo(item.screen as Screen)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl cursor-pointer"
              style={{ background: item.bg, border: `1px solid ${item.color}22` }}>
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] font-bold text-center leading-tight" style={{ color: '#1F2937' }}>{item.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Advanced features list */}
        <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white" style={{ boxShadow: '0 4px 20px -4px rgba(0,0,0,0.08)' }}>
          <div className="px-4 py-2.5 border-b border-gray-50">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Advanced Features</span>
          </div>
          {[
            { icon: '⚡', label: 'Weather Forecast', sub: '7-day · Hyperlocal', screen: 'forecast', color: '#F59E0B' },
            { icon: '💧', label: 'Smart Irrigation', sub: 'AI water scheduling', screen: 'smart-irrigation', color: '#3B82F6' },
            { icon: '📡', label: 'Acoustic Scan', sub: 'Pest audio detection', screen: 'acoustic-scanner', color: '#8B5CF6' },
            { icon: '🔗', label: 'Traceability', sub: 'Supply chain QR', screen: 'traceability', color: '#10B981' },
            { icon: '🏗', label: 'Digital Twin', sub: '2D farm layout', screen: 'digital-twin', color: '#EC4899' },
          ].map((item, i, arr) => (
            <motion.button key={i} whileTap={{ scale: 0.99 }}
              onClick={() => navigateTo(item.screen as Screen)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: `${item.color}15` }}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{item.label}</p>
                <p className="text-[10px] text-gray-400 font-medium">{item.sub}</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* ════════════════ MY CROPS ════════════════ */}
      {crops.length > 0 && (
        <div className="mt-6 px-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-gray-900">My Crops</h2>
            <span className="text-xs text-gray-400">{crops.length} varieties</span>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {crops.map((crop, i) => (
              <motion.div key={i} whileTap={{ scale: 0.95 }}
                onClick={() => navigateTo('vision')}
                className="flex-shrink-0 relative rounded-2xl overflow-hidden cursor-pointer"
                style={{ width: 100, height: 120 }}>
                <img src={getCropImage(crop)} alt={crop} className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-xs font-black text-white truncate">{crop}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="h-1 rounded-full flex-1 bg-white/20">
                      <div className="h-1 rounded-full bg-emerald-400" style={{ width: `${60 + i * 15}%` }} />
                    </div>
                    <span className="text-[8px] text-white/70">{60 + i * 15}%</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════ CARBON WALLET ════════════════ */}
      <div className="px-5 mt-6">
        <CarbonWalletCard />
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigateTo('landmark')}
          className="relative w-full mt-3 rounded-2xl p-4 flex items-center justify-center gap-2.5 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '2px dashed #22C55E' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', boxShadow: '0 4px 10px rgba(22,163,74,0.4)' }}>
            <MapPin size={16} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-gray-800">Locate My Farm Boundary</p>
            <p className="text-xs text-gray-500">Draw fields on map for precise monitoring</p>
          </div>
          <ArrowRight size={16} className="text-emerald-600 ml-auto" />
        </motion.button>
      </div>

      {/* ════════════════ MY FIELDS ════════════════ */}
      <div className="px-5 mt-6 pb-32">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-gray-900">My Fields</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigateTo('landmark')}
            className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <Plus size={11} strokeWidth={3} /> Add Field
          </motion.button>
        </div>

        {isLoadingPlots && (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoadingPlots && userPlots.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden text-center py-8 px-4"
            style={{ background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)', border: '2px dashed #86EFAC' }}>
            <div className="text-5xl mb-3">🌾</div>
            <p className="font-bold text-gray-700 text-sm">No fields added yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your farm boundary to unlock satellite monitoring & AI insights</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigateTo('landmark')}
              className="mt-4 px-5 py-2 rounded-full text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', boxShadow: '0 4px 14px rgba(22,163,74,0.4)' }}>
              + Add My First Field
            </motion.button>
          </motion.div>
        )}

        {!isLoadingPlots && userPlots.map((plot, i) => (
          <motion.div key={plot.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
            whileTap={{ scale: 0.98 }} onClick={() => navigateTo('field-monitor')}
            className="mb-3 rounded-2xl overflow-hidden cursor-pointer"
            style={{ background: 'white', border: '1px solid #F3F4F6', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.08)' }}>
            <div className="flex">
              <div className="w-24 h-24 relative flex-shrink-0">
                <img src={fieldImages[i % fieldImages.length]} alt="Field" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
              </div>
              <div className="flex-1 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-black text-gray-800">{plot.name || `Field ${i + 1}`}</p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">{plot.area_acres ? `${plot.area_acres} acres` : '—'}</p>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: '#ECFDF5' }}>
                    <PulseDot color="#10B981" />
                    <span className="text-[9px] font-bold text-emerald-700">ACTIVE</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[9px] text-gray-400 font-bold">NDVI Health</span>
                      <span className="text-[9px] font-black text-emerald-600">{70 + i * 8}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${70 + i * 8}%` }} transition={{ delay: 0.5, duration: 0.8 }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #34D399, #10B981)' }} />
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ════════════════ MODALS ════════════════ */}
      <AnimatePresence>
        {showWeatherModal && <WeatherModal weather={weather} locationName={locationName} onClose={() => setShowWeatherModal(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showLocationPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-end"
            onClick={(e) => e.target === e.currentTarget && setShowLocationPicker(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full rounded-t-3xl p-6 bg-white">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
              <h3 className="text-lg font-black text-gray-900 mb-4">Set Location</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={cityQuery} onChange={(e) => handleCitySearch(e.target.value)}
                  placeholder="Search city or village..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-medium outline-none focus:border-emerald-400 focus:bg-white transition-all" />
              </div>
              {citySearching && <div className="text-center py-4 text-sm text-gray-400">Searching…</div>}
              {cityResults.map((city: any, i: number) => (
                <motion.button key={i} whileTap={{ scale: 0.98 }} onClick={() => handlePickCity(city)}
                  className="w-full text-left px-4 py-3 mt-2 rounded-2xl bg-gray-50 hover:bg-emerald-50 transition-colors">
                  <p className="font-bold text-gray-800 text-sm">{city.name}</p>
                  <p className="text-xs text-gray-400">{city.country}</p>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardScreen;
