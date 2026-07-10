import React, { useState, useEffect } from 'react';
import { Screen, UserProfile, Language } from '../types';
import { languages } from '../translations';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Bell,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Leaf,
  MoreHorizontal,
  Home,
  Sprout,
  Zap,
  Landmark,
  Radio,
  ScrollText,
  Activity,
  Calendar,
  Bot,
  Umbrella,
  TrendingUp,
  ScanLine,
  BookOpen,
  Coins,
  ArrowRight,
  MessageCircle,
  Sun,
  Plus,
  Link2,
  Building2,
  ChevronRight,
  BarChart2,
  Search,
  Grid3x3,
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

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigateTo, user, t, onLangChange, currentLang, weather, locationName }) => {
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [userPlots, setUserPlots] = useState<any[]>([]);
  const [isLoadingPlots, setIsLoadingPlots] = useState(true);
  const [plotLocationNames, setPlotLocationNames] = useState<{ [key: number]: string }>({});
  const hasFetched = React.useRef(false);

  // ── Location picker state ──
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<any[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const citySearchTimer = React.useRef<any>(null);

  useEffect(() => {
    // Guard: only fetch once per component lifetime to avoid double-fire
    // from AnimatePresence remounts or locationName prop changes.
    if (hasFetched.current) return;
    hasFetched.current = true;

    const locationFallback = locationName; // snapshot at mount time

    const fetchPlots = async () => {
      try {
        const data = await plotService.getPlots();
        setUserPlots(data);

        // Sequential geocoding with 250ms throttle to respect Nominatim's 1 req/s limit
        const locationMap: { [key: number]: string } = {};
        for (const plot of data) {
          if (plot.coordinates && plot.coordinates.length > 0) {
            const firstCoord = plot.coordinates[0];
            try {
              const locData = await weatherService.reverseGeocode(firstCoord.lat, firstCoord.lng);
              if (locData && (locData.city || locData.district)) {
                locationMap[plot.id] = `${locData.city || ''}${locData.city && locData.district ? ', ' : ''}${locData.district || ''}`;
              } else {
                locationMap[plot.id] = locationFallback.split(',')[0] || 'Unknown Location';
              }
            } catch (locErr) {
              console.error(`Failed to reverse geocode plot ${plot.id}:`, locErr);
              locationMap[plot.id] = locationFallback.split(',')[0] || 'Unknown Location';
            }
            // 250ms throttle — prevents 429 rate-limiting from Nominatim (1 req/s max)
            await new Promise(r => setTimeout(r, 250));
          } else {
            locationMap[plot.id] = locationFallback.split(',')[0] || 'Unknown Location';
          }
        }
        setPlotLocationNames(locationMap);

      } catch (error) {
        console.error('Failed to fetch user plots:', error);
      } finally {
        setIsLoadingPlots(false);
      }
    };
    fetchPlots();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── City search debounce ──
  const handleCitySearch = (q: string) => {
    setCityQuery(q);
    clearTimeout(citySearchTimer.current);
    if (!q.trim()) { setCityResults([]); return; }
    citySearchTimer.current = setTimeout(async () => {
      setCitySearching(true);
      try {
        const results = await weatherService.searchCity(q);
        setCityResults(results || []);
      } catch { setCityResults([]); }
      finally { setCitySearching(false); }
    }, 400);
  };

  const handlePickCity = (city: any) => {
    const loc = { lat: city.latitude, lng: city.longitude, name: `${city.name}, ${city.country}` };
    // Persist so it overrides IP location on next load
    localStorage.setItem('kd_saved_location', JSON.stringify(loc));
    // Clear session cache so App.tsx re-fetches weather with new coords
    sessionStorage.removeItem('kd_last_location');
    setShowLocationPicker(false);
    setCityQuery('');
    setCityResults([]);
    // Reload to apply new location everywhere
    window.location.reload();
  };

  const currentTemp = weather?.current?.temperature_2m ? Math.round(weather.current.temperature_2m) : '--';

  const crops = (user?.crops && Array.isArray(user.crops) && user.crops.length > 0) ? user.crops : [];

  const getCropImage = (crop: string) => {
    const map: any = {
      'Wheat': 'https://images.unsplash.com/photo-1501430654243-c934cec2e1c0?w=1000&q=80',
      'Corn': 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=1000&q=80',
      'Grapes': 'https://images.unsplash.com/photo-1537640538965-1756fb179c26?w=1000&q=80',
      'Potato': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=1000&q=80',
      'Olive': 'https://images.unsplash.com/photo-1471180625745-944903837c22?w=1000&q=80',
      'Rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1000&q=80',
    };
    return map[crop] || map['Wheat'];
  };

  const fieldImages = [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800',
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800',
    'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800',
    'https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?w=800',
    'https://images.unsplash.com/photo-1589710321151-2495dbfc1fa2?w=800'
  ];

  const getFieldImage = (id: number) => {
    return fieldImages[id % fieldImages.length];
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-full pb-0 font-sans text-gray-800 relative bg-white"
    >

      {/* Dynamic Animated Background Mesh */}
      <div className="absolute top-0 left-0 w-full h-[600px] z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-amber-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/10 via-white/50 to-transparent"></div>
      </div>

      {/* 1. Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="px-6 pt-12 pb-6 flex justify-between items-start relative z-20"
      >
        <div>
          <h1 className="text-4xl font-light text-gray-800 tracking-tight">Hello, <span className="font-bold text-gray-900">{user?.name?.split(' ')[0] || 'Farmer'}</span></h1>
          <button
            onClick={() => setShowLocationPicker(true)}
            className="flex flex-col mt-1 self-start px-2 py-1.5 rounded-xl hover:bg-amber-50 active:scale-95 transition-all border border-transparent hover:border-amber-200 group"
          >
            <div className="flex items-center gap-1">
              <MapPin size={14} className="text-emerald-500" fill="currentColor" />
              <span className="text-sm font-semibold text-gray-800 tracking-wide">{locationName.split(',')[0]}</span>
              <span className="text-[10px] text-gray-400 font-bold">▼</span>
            </div>
            <span className="text-[10px] text-amber-500 font-semibold ml-4 group-hover:text-amber-600">
              Wrong location? Tap to set →
            </span>
          </button>
        </div>


        <div className="flex items-center gap-3 relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            className="p-3 bg-white rounded-full shadow-lg shadow-orange-100/50 relative hover:bg-orange-50 transition-colors"
            onClick={() => setShowLangMenu(!showLangMenu)}
          >
            <span className="sr-only">Change Language</span>
            <div className={`w-5 h-5 flex items-center justify-center font-bold text-xs border-2 rounded-full transition-colors ${showLangMenu ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-900 border-gray-900'}`}>
              {currentLang.toUpperCase()}
            </div>
          </motion.button>

          <AnimatePresence>
            {showLangMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60]"
                  onClick={() => setShowLangMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute top-full mt-2 right-12 bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 z-[70] w-48 max-h-80 overflow-y-auto"
                  style={{ minWidth: '200px' }}
                >
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Language ({languages.length})</span>
                  </div>
                  {languages.map((lang: any) => (
                    <motion.button
                      key={lang.code}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      className={`w-full text-left px-3 py-3 rounded-xl text-sm font-bold flex justify-between items-center transition-all mb-1 ${currentLang === lang.code
                        ? 'bg-green-50 text-green-700 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => {
                        onLangChange(lang.code as Language);
                        setShowLangMenu(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span>{lang.label}</span>
                        <span className="text-[10px] font-medium text-gray-400">{lang.native}</span>
                      </div>
                      {currentLang === lang.code && <div className="w-2 h-2 rounded-full bg-green-500 shadow-green-200 shadow-lg" />}
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            className="p-3 bg-white rounded-full shadow-lg shadow-orange-100/50 relative hover:bg-orange-50 transition-colors"
            onClick={() => navigateTo('corporate-dashboard')}
          >
            <Building2 size={20} className="text-gray-900" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            className="p-3 bg-white rounded-full shadow-lg shadow-orange-100/50 relative hover:bg-orange-50 transition-colors"
          >
            <div className="w-2 h-2 bg-black rounded-full absolute top-3 right-3 border border-white pointer-events-none" />
            <Bell size={20} className="text-gray-900" fill="black" />
          </motion.button>
        </div>
      </motion.div>

      {/* 2. Weather Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="px-6 mb-8 relative"
      >
        <motion.div variants={itemVariants} className="flex justify-between items-start relative z-10 mb-6">
          <div>
            <div className="flex items-start gap-2">
              <span className="text-7xl font-medium text-gray-900 tracking-tighter">{currentTemp}°</span>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sun size={32} className="text-yellow-400 fill-yellow-400 mt-2" />
              </motion.div>
            </div>
            <p className="text-md font-medium text-gray-500 mt-1">
              {locationName.split(',').slice(-1)[0]?.trim() || locationName}
            </p>
          </div>
          <div className="absolute -top-60 -right-8 w-64 h-[34rem] z-0 pointer-events-none mix-blend-multiply opacity-90">
            <img src="/assets/crops/Wheat.jpg" className="w-full h-full object-contain" alt="Wheat" />
          </div>
        </motion.div>

        {/* 2x2 Grid Pills */}
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="glass rounded-[2rem] p-4 flex items-center gap-3 cursor-default">
            <div className="w-10 h-10 rounded-full bg-emerald-50/80 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
              <Thermometer size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Soil temp</p>
              <p className="text-lg font-bold text-gray-900">
                {weather?.current?.soil_temperature_0cm !== undefined ? `+${Math.round(weather.current.soil_temperature_0cm)} C` : '-- C'}
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="glass rounded-[2rem] p-4 flex items-center gap-3 cursor-default">
            <div className="w-10 h-10 rounded-full bg-blue-50/80 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
              <Droplets size={18} fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Humidity</p>
              <p className="text-lg font-bold text-gray-900">
                {weather?.current?.relative_humidity_2m ?? '--'}%
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="glass rounded-[2rem] p-4 flex items-center gap-3 cursor-default">
            <div className="w-10 h-10 rounded-full bg-amber-50/80 flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
              <Wind size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Wind</p>
              <p className="text-lg font-bold text-gray-900">
                {weather?.current?.wind_speed_10m ?? '--'} m/s
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="glass rounded-[2rem] p-4 flex items-center gap-3 cursor-default">
            <div className="w-10 h-10 rounded-full bg-indigo-50/80 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
              <CloudRain size={18} fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Precipitation</p>
              <p className="text-lg font-bold text-gray-900">
                {weather?.current?.precipitation ?? '--'} mm
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Carbon Wallet Integration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
        className="mx-6 mb-6"
      >
        <CarbonWalletCard />
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigateTo('landmark')}
          className="w-full mt-4 bg-white border-2 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 shadow-sm"
          style={{ borderColor: '#00BB78' }}
        >
          <MapPin size={20} style={{ color: '#00BB78' }} />
          <span className="font-bold" style={{ color: '#001A11' }}>Locate My Farm Boundary</span>
        </motion.button>
      </motion.div>

      {/* Supply Chain Traceability Discovery Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 20 }}
        className="mx-6 mb-6"
      >
        <div
          onClick={() => navigateTo('traceability')}
          className="cursor-pointer overflow-hidden"
          style={{ background: '#0D0D0D', border: '1px solid #292524' }}
        >
          {/* Header strip */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1c1917' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#F59E0B', letterSpacing: '0.2em' }}>SUPPLY CHAIN TRACEABILITY</span>
            </div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#57534e', letterSpacing: '0.15em' }}>OPEN LEDGER →</span>
          </div>

          {/* 4-step cycle */}
          <div className="grid grid-cols-4" style={{ borderBottom: '1px solid #1c1917' }}>
            {[
              { step: '01', label: 'HARVEST', icon: '🌾' },
              { step: '02', label: 'MINT', icon: '◆' },
              { step: '03', label: 'QR CODE', icon: '▣' },
              { step: '04', label: 'VERIFY', icon: '✓' },
            ].map((item, i) => (
              <div key={item.step}
                className="py-3 flex flex-col items-center gap-1"
                style={{ borderRight: i < 3 ? '1px solid #1c1917' : 'none' }}
              >
                <span className="text-base">{item.icon}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#F59E0B', fontWeight: 700 }}>{item.step}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '7px', color: '#57534e', letterSpacing: '0.1em' }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Tagline */}
          <div className="px-4 py-2.5">
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#78716c', lineHeight: 1.6 }}>
              Mint a harvest token after every crop cycle. Buyers scan a QR to verify your crop's carbon footprint, chemical inputs &amp; origin — CBAM compliant.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          SERVICES
      ═══════════════════════════════════════════════ */}
      <div className="px-5 mt-4 mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: '#001A11' }}>Services</h2>
          <span className="text-[11px] font-semibold" style={{ color: '#00BB78' }}>9 tools</span>
        </div>

        {/* ── ROW 1: Two featured large cards ── */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigateTo('market' as Screen)}
            className="flex flex-col justify-between p-4 rounded-3xl text-left"
            style={{ background: '#001A11', minHeight: 130 }}
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,187,120,0.15)' }}>
              <TrendingUp size={20} style={{ color: '#00BB78' }} />
            </div>
            <div className="mt-6">
              <p className="text-[13px] font-bold text-white leading-tight">Market Prices</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#A5FFA7' }}>Live mandi rates</p>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigateTo('vision' as Screen)}
            className="flex flex-col justify-between p-4 rounded-3xl text-left"
            style={{ background: '#00BB78', minHeight: 130 }}
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <ScanLine size={20} className="text-white" />
            </div>
            <div className="mt-6">
              <p className="text-[13px] font-bold text-white leading-tight">Crop Scanner</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>AI disease detection</p>
            </div>
          </motion.button>
        </div>

        {/* ── ROW 2: 2×2 grid ── */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { icon: <BookOpen size={16} strokeWidth={2} />, label: 'Govt Schemes', desc: 'Subsidies & loans', screen: 'scheme-setu', iconColor: '#001A11', bg: '#F5FAF7' },
            { icon: <Umbrella size={16} strokeWidth={2} />, label: 'Crop Insurance', desc: 'Protect your yield', screen: 'insurance', iconColor: '#001A11', bg: '#F5FAF7' },
            { icon: <Activity size={16} strokeWidth={2} />, label: 'Soil Carbon', desc: 'SOC modeling', screen: 'soil-carbon', iconColor: '#00BB78', bg: '#E8FBF3' },
            { icon: <Sprout size={16} strokeWidth={2} />, label: 'Carbon Vault', desc: 'Credit management', screen: 'carbon-vault', iconColor: '#00BB78', bg: '#E8FBF3' },
          ].map((s, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigateTo(s.screen as Screen)}
              className="flex flex-col gap-3 p-3.5 rounded-2xl text-left"
              style={{ background: s.bg, border: '1px solid #EFEFEF' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white" style={{ color: s.iconColor }}>
                {s.icon}
              </div>
              <div>
                <p className="text-[12px] font-bold leading-tight" style={{ color: '#001A11' }}>{s.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#616B68' }}>{s.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* ── ROW 3: Compact list ── */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #F0F0F0' }}>
          {[
            { icon: <Zap size={15} strokeWidth={2} />, label: 'Weather Forecast', desc: '7-day prediction', screen: 'forecast' },
            { icon: <Droplets size={15} strokeWidth={2} />, label: 'Smart Irrigation', desc: 'Water optimization', screen: 'smart-irrigation' },
            { icon: <Grid3x3 size={15} strokeWidth={2} />, label: 'Digital Twin', desc: '2D farm layout', screen: 'digital-twin' },
            { icon: <Radio size={15} strokeWidth={2} />, label: 'Acoustic Scan', desc: 'Bioacoustic monitor', screen: 'acoustic-scanner' },
            { icon: <Link2 size={15} strokeWidth={2} />, label: 'Traceability', desc: 'Supply chain QR', screen: 'traceability' },
          ].map((s, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigateTo(s.screen as Screen)}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-white text-left"
              style={{ borderBottom: i < 2 ? '1px solid #F8F8F8' : 'none' }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F5F5F5', color: '#616B68' }}>
                {s.icon}
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold" style={{ color: '#001A11' }}>{s.label}</p>
                <p className="text-[11px]" style={{ color: '#616B68' }}>{s.desc}</p>
              </div>
              <ChevronRight size={14} style={{ color: '#A5FFA7', flexShrink: 0 }} />
            </motion.button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          COMMODITIES & FOOD
      ═══════════════════════════════════════════════ */}
      {crops.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="px-6 mt-4 relative z-10 w-full overflow-hidden"
        >
          <h2 className="text-base font-bold text-gray-900 mb-4">Commodities &amp; Food</h2>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 pr-6 snap-x">
            {crops.map((crop, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.95 }}
                className="snap-start flex flex-col gap-2 flex-shrink-0 cursor-pointer group"
              >
                <div className="w-[68px] h-[68px] rounded-full overflow-hidden shadow-md border-2 border-white relative">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all z-10"></div>
                  <img
                    src={getCropImage(crop)}
                    alt={crop}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center">{crop}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          MY FIELDS
      ═══════════════════════════════════════════════ */}
      <div className="mt-6 px-5 pb-10" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: '#001A11' }}>My Fields</h2>
          <button
            onClick={() => navigateTo('landmark')}
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: '#00BB78' }}
          >
            <Plus size={13} strokeWidth={2.5} /> Add
          </button>
        </div>

        {isLoadingPlots && (
          <div className="flex items-center gap-3 p-5 bg-gray-50 border border-gray-100 rounded-2xl">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-[#00BB78] rounded-full animate-spin flex-shrink-0" />
            <span className="text-sm font-medium" style={{ color: '#616B68' }}>Loading your plots…</span>
          </div>
        )}

        {!isLoadingPlots && userPlots.length === 0 && (
          <button
            onClick={() => navigateTo('map')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl active:scale-95 transition-transform"
            style={{ background: '#F7FFFE', border: '1.5px dashed #00BB78' }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#E8FBF3' }}>
              <MapPin size={20} style={{ color: '#00BB78' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: '#001A11' }}>No fields added yet</p>
              <p className="text-xs mt-0.5" style={{ color: '#616B68' }}>Tap to locate your farm on the map</p>
            </div>
            <ChevronRight size={16} style={{ color: '#A5FFA7', marginLeft: 'auto', flexShrink: 0 }} />
          </button>
        )}

        {!isLoadingPlots && userPlots.length > 0 && (
          <div className="space-y-3">
            {userPlots.map((plot) => (
              <div key={plot.id} className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #F0F0F0', boxShadow: '0 2px 8px rgba(0,187,120,0.06)' }}>
                {/* Field image */}
                <div className="relative h-36 w-full">
                  <img
                    src={getFieldImage(plot.id)}
                    alt={plot.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                    <div>
                      <h3 className="text-sm font-bold text-white">{plot.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={10} style={{ color: '#A5FFA7' }} />
                        <span className="text-[10px] text-gray-300">{plotLocationNames[plot.id] || 'Locating…'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,187,120,0.25)', backdropFilter: 'blur(8px)' }}>
                      <Leaf size={11} style={{ color: '#A5FFA7' }} />
                      <span className="text-xs font-bold text-white">{plot.area} ha</span>
                    </div>
                  </div>
                </div>

                {/* Action row */}
                <div className="grid grid-cols-3" style={{ borderTop: '1px solid #F0F0F0' }}>
                  {[
                    { icon: <MapPin size={15} style={{ color: '#00BB78' }} />, label: 'Map', action: () => navigateTo('map') },
                    { icon: <BarChart2 size={15} style={{ color: '#00BB78' }} />, label: 'Satellite', action: () => navigateTo('field-monitor', { plotId: plot.id }) },
                    { icon: <TrendingUp size={15} style={{ color: '#00BB78' }} />, label: 'Yield', action: () => navigateTo('forecast') },
                  ].map((btn, i) => (
                    <button
                      key={i}
                      onClick={btn.action}
                      className="flex flex-col items-center gap-1.5 py-3 transition-colors"
                      style={{ borderRight: i < 2 ? '1px solid #F0F0F0' : 'none' }}
                    >
                      {btn.icon}
                      <span className="text-[10px] font-semibold" style={{ color: '#616B68' }}>{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Location Picker Modal ── */}
      <AnimatePresence>
        {showLocationPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
              onClick={() => { setShowLocationPicker(false); setCityQuery(''); setCityResults([]); }}
            />
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl z-[201] p-5 shadow-2xl"
              style={{ maxHeight: '80vh' }}
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#E8FBF3' }}>
                  <MapPin size={20} style={{ color: '#00BB78' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: '#001A11' }}>Set Your Location</h2>
                  <p className="text-xs" style={{ color: '#616B68' }}>Search for your city or district</p>
                </div>
              </div>

              {/* Search input */}
              <div className="relative mb-3">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#616B68' }} />
                <input
                  autoFocus
                  type="text"
                  value={cityQuery}
                  onChange={e => handleCitySearch(e.target.value)}
                  placeholder="e.g. Nagpur, Pune, Hubli..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl text-sm font-medium focus:outline-none transition-all"
                  style={{ border: '1.5px solid #E0E0E0', fontFamily: 'Inter, sans-serif' }}
                />
                {citySearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid #A5FFA7', borderTopColor: '#00BB78' }} />
                  </div>
                )}
              </div>

              {/* Results */}
              <div className="overflow-y-auto" style={{ maxHeight: '45vh' }}>
                {cityResults.length > 0 ? (
                  <div className="space-y-1">
                    {cityResults.map((city, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => handlePickCity(city)}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl transition-colors text-left"
                        style={{ '--hover-bg': '#E8FBF3' } as any}
                        onMouseEnter={e => (e.currentTarget.style.background = '#E8FBF3')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F5F5F5' }}>
                          <MapPin size={14} style={{ color: '#616B68' }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#001A11' }}>{city.name}</p>
                          <p className="text-xs" style={{ color: '#616B68' }}>{city.country} · {city.latitude?.toFixed(2)}°N, {city.longitude?.toFixed(2)}°E</p>
                        </div>
                        <ChevronRight size={14} style={{ color: '#A5FFA7', marginLeft: 'auto', flexShrink: 0 }} />
                      </motion.button>
                    ))}
                  </div>
                ) : cityQuery && !citySearching ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <MapPin size={22} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">No results for "{cityQuery}"</p>
                    <p className="text-xs text-gray-400 mt-1">Try a different spelling or nearby city</p>
                  </div>
                ) : !cityQuery ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-400 font-medium">Start typing to search cities</p>
                    {localStorage.getItem('kd_saved_location') && (
                      <button
                        onClick={() => { localStorage.removeItem('kd_saved_location'); sessionStorage.removeItem('kd_last_location'); window.location.reload(); }}
                        className="mt-3 text-xs text-red-500 font-semibold underline"
                      >
                        Reset to auto-detect
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DashboardScreen;
