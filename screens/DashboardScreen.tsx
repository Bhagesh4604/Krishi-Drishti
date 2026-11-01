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

  ArrowUpRight,

  MessageCircle,

  Sun,

  Moon,

  Plus,

  Link2,

  Building2,

  ChevronRight,

  BarChart2,

  Search,

  Grid3x3,

  Brain,

  Mic,

  X,

} from 'lucide-react';

import { weatherService } from '../src/services/api';

import WeatherModal from '../components/WeatherModal';

import CarbonWalletCard from '../components/CarbonWalletCard';

import { plotService } from '../src/services/api';

import Tilt3D from '../components/Tilt3D';



interface DashboardScreenProps {

  navigateTo: (screen: Screen) => void;

  user: UserProfile | null;

  t: any;

  onLangChange: (lang: Language) => void;

  currentLang: Language;

  weather: any;

  locationName: string;

}



const cropImageByName: Record<string, string> = {
  wheat: 'https://images.unsplash.com/photo-1501430654243-c934cec2e1c0?w=600&q=75',
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=75',
  paddy: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=75',
  cotton: '/assets/crops/cotton.jpg',
  tomato: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=75',
  potato: 'https://media.istockphoto.com/id/2192677464/photo/close-up-of-farmer-holding-potato-at-farm.webp?a=1&b=1&s=612x612&w=0&k=20&c=8XxVnwxQv6xz_vtjxYG9VPqQoBv2mSg-s5FJqpRtT2w=',
  corn: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=75',
  maize: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=75',
  soybean: '/assets/crops/soybean.jpg',
  soya: '/assets/crops/soybean.jpg',
  sugarcane: '/assets/crops/sugarcane.jpg',
  'sugar cane': '/assets/crops/sugarcane.jpg',
  onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&q=75',
  grapes: 'https://images.unsplash.com/photo-1537640538965-1756fb179c26?w=600&q=75',
  olive: 'https://images.unsplash.com/photo-1471180625745-944903837c22?w=600&q=75',
};

const cropEmojiByName: Record<string, string> = {
  wheat: '🌾', rice: '🌾', paddy: '🌾', cotton: '☁️', tomato: '🍅', potato: '🥔',
  corn: '🌽', maize: '🌽', soybean: '🫘', soya: '🫘', sugarcane: '🎋', 'sugar cane': '🎋',
  onion: '🧅', grapes: '🍇', olive: '🫒',
};

const cropNameKey = (crop: string) => crop.trim().toLocaleLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

const CropThumbnail: React.FC<{ crop: string }> = ({ crop }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const key = cropNameKey(crop);
  const image = cropImageByName[key];

  if (!image || imageFailed) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ background: 'linear-gradient(145deg, #ecfdf5, #d1fae5)' }}
        aria-label={`${crop} crop illustration`}
      >
        <span className="text-3xl" aria-hidden="true">{cropEmojiByName[key] || '🌱'}</span>
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={`${crop} crop`}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
};

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigateTo, user, t, onLangChange, currentLang, weather, locationName }) => {

  const [showWeatherModal, setShowWeatherModal] = useState(false);

  const [showLangMenu, setShowLangMenu] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);

  const [userPlots, setUserPlots] = useState<any[]>(() => {

    try {

      const cached = localStorage.getItem('kd_cached_plots');

      return cached ? JSON.parse(cached) : [];

    } catch {

      return [];

    }

  });

  const [isLoadingPlots, setIsLoadingPlots] = useState(() => {

    return !localStorage.getItem('kd_cached_plots');

  });

  const [plotLocationNames, setPlotLocationNames] = useState<{ [key: number]: string }>(() => {

    try {

      const cached = localStorage.getItem('kd_cached_plot_locs');

      return cached ? JSON.parse(cached) : {};

    } catch {

      return {};

    }

  });

  const [isDark, setIsDark] = useState(false);

  const hasFetched = React.useRef(false);



  useEffect(() => {

    if (isDark) {

      document.documentElement.classList.add('dark-theme-override');

    } else {

      document.documentElement.classList.remove('dark-theme-override');

    }

  }, [isDark]);



  // ΓöÇΓöÇ Location picker state ΓöÇΓöÇ

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

        localStorage.setItem('kd_cached_plots', JSON.stringify(data));



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

            // 250ms throttle ΓÇö prevents 429 rate-limiting from Nominatim (1 req/s max)

            await new Promise(r => setTimeout(r, 250));

          } else {

            locationMap[plot.id] = locationFallback.split(',')[0] || 'Unknown Location';

          }

        }

        setPlotLocationNames(locationMap);

        localStorage.setItem('kd_cached_plot_locs', JSON.stringify(locationMap));



      } catch (error) {

        console.error('Failed to fetch user plots:', error);

      } finally {

        setIsLoadingPlots(false);

      }

    };

    fetchPlots();

  }, []); // eslint-disable-line react-hooks/exhaustive-deps



  // ΓöÇΓöÇ City search debounce ΓöÇΓöÇ

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



  const fieldImages = [

    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',

    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800',

    'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800',

    'https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?w=800',

    'https://images.unsplash.com/photo-1589710321151-2495dbfc1fa2?w=800'

  ];



  const getFieldImage = (id: string | number) => {

    // Generate a simple hash from the id so that the image is deterministic but varies by plot

    const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return fieldImages[hash % fieldImages.length];

  };



  // Animation Variants

  const containerVariants = {

    hidden: { opacity: 0 },

    show: {

      opacity: 1,

      transition: { staggerChildren: 0.03, delayChildren: 0.02 }

    }

  };



  const itemVariants = {

    hidden: { opacity: 0 },

    show: { opacity: 1, transition: { duration: 0.15 } }

  };



  return (
    <div
      className="dashboard-screen min-h-full pb-12 font-sans text-gray-800 relative w-full max-w-full overflow-x-hidden"
      style={{ background: 'linear-gradient(180deg, #f4fbf6 0%, #ffffff 32%, #ffffff 100%)' }}
    >



      {/* Dynamic Animated Background Mesh ΓÇö aurora depth field */}

      <div className="dashboard-ambient absolute top-0 left-0 w-full h-[620px] z-0 overflow-hidden pointer-events-none">

        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-300/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float"></div>

        <div className="absolute top-10 -right-10 w-80 h-80 bg-amber-300/45 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-glow" style={{ animationDelay: '2s' }}></div>

        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-300/45 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '4s' }}></div>

        {/* floating 3D orbs */}

        <motion.div

          animate={{ y: [0, -18, 0], x: [0, 8, 0] }}

          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}

          className="absolute top-40 right-10 w-16 h-16 rounded-full opacity-60"

          style={{ background: 'radial-gradient(circle at 30% 30%, #6ee7b7, #059669 70%, #065f46)', boxShadow: '0 14px 28px rgba(5,150,105,0.35), inset 0 2px 6px rgba(255,255,255,0.6)' }}

        />

        <motion.div

          animate={{ y: [0, 14, 0], x: [0, -10, 0] }}

          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}

          className="absolute top-72 left-6 w-10 h-10 rounded-full opacity-50"

          style={{ background: 'radial-gradient(circle at 30% 30%, #fde68a, #f59e0b 70%, #b45309)', boxShadow: '0 12px 24px rgba(245,158,11,0.35), inset 0 2px 5px rgba(255,255,255,0.6)' }}

        />

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

            aria-expanded={showLangMenu}

            onClick={() => {
              setShowNotifications(false);
              setShowLangMenu(!showLangMenu);
            }}

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

            aria-label="Open notifications"

            aria-expanded={showNotifications}

            onClick={() => {
              setShowLangMenu(false);
              setShowNotifications(value => !value);
            }}

          >

            <Bell size={20} className={showNotifications ? 'text-emerald-700' : 'text-gray-900'} />

          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <motion.button
                  type="button"
                  aria-label="Close notifications"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] cursor-default"
                  onClick={() => setShowNotifications(false)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Notifications"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 top-full z-[70] mt-3 rounded-3xl border border-emerald-100 bg-white p-4 shadow-2xl shadow-emerald-950/15"
                  style={{ width: 'min(19rem, calc(100vw - 2.5rem))' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <Bell size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-extrabold text-gray-900">Notifications</h2>
                      <p className="text-[11px] text-gray-500">Farm updates and alerts</p>
                    </div>
                    <button type="button" aria-label="Close notifications" onClick={() => setShowNotifications(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 px-4 py-5 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                      <Sprout size={21} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-gray-800">You’re all caught up</p>
                    <p className="mx-auto mt-1 max-w-[15rem] text-[11px] leading-relaxed text-gray-500">
                      There are no new farm alerts right now. Check your market or field tools for the latest updates.
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowNotifications(false); navigateTo('market'); }}
                      className="rounded-xl border border-gray-100 px-3 py-2.5 text-left text-[11px] font-bold text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50"
                    >
                      <span className="block text-emerald-700">Live market</span>
                      <span className="mt-0.5 block font-medium text-gray-500">Check crop prices</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNotifications(false); navigateTo('landmark'); }}
                      className="rounded-xl border border-gray-100 px-3 py-2.5 text-left text-[11px] font-bold text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50"
                    >
                      <span className="block text-emerald-700">My fields</span>
                      <span className="mt-0.5 block font-medium text-gray-500">Manage boundaries</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

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

            <div className="flex items-end gap-2">

              <span className="text-7xl font-medium text-gray-900 tracking-tighter">{currentTemp}&#176;</span>

              <motion.div

                animate={{ rotate: 360 }}

                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}

                className="mb-2"

              >

                <Sun size={32} className="text-yellow-400 fill-yellow-400" />

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



        <div className="grid grid-cols-2 gap-4 relative z-10" style={{ perspective: '900px' }}>

          {[

            { label: 'Soil temp', value: weather?.current?.soil_temperature_0cm !== undefined ? `+${Math.round(Number(weather.current.soil_temperature_0cm))}°C` : '--°C', icon: <Thermometer size={18} />, chipBg: 'linear-gradient(140deg,#a7f3d0,#34d399)', chipColor: '#047857' },

            { label: 'Humidity', value: `${weather?.current?.relative_humidity_2m !== undefined ? Math.round(Number(weather.current.relative_humidity_2m)) : '--'}%`, icon: <Droplets size={18} fill="currentColor" />, chipBg: 'linear-gradient(140deg,#bfdbfe,#60a5fa)', chipColor: '#1d4ed8' },

            { label: 'Wind', value: `${weather?.current?.wind_speed_10m !== undefined ? Number(weather.current.wind_speed_10m).toFixed(1) : '--'} m/s`, icon: <Wind size={18} />, chipBg: 'linear-gradient(140deg,#fde68a,#fbbf24)', chipColor: '#b45309' },

            { label: 'Precipitation', value: `${weather?.current?.precipitation !== undefined ? Number(weather.current.precipitation).toFixed(1) : '--'} mm`, icon: <CloudRain size={18} fill="currentColor" />, chipBg: 'linear-gradient(140deg,#c7d2fe,#818cf8)', chipColor: '#4338ca' },

          ].map((pill, i) => (

            <Tilt3D key={i} maxTilt={9} className="rounded-[2rem]">

              <div variants={itemVariants} className="glass rounded-[2rem] p-4 flex items-center gap-3 cursor-default h-full">

                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md border border-white/70 icon-chip-3d"

                  style={{ background: pill.chipBg, color: pill.chipColor }}>

                  {pill.icon}

                </div>

                <div>

                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{pill.label}</p>

                  <p className="text-lg font-bold text-gray-900">{pill.value}</p>

                </div>

              </div>

            </Tilt3D>

          ))}

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

          whileHover={{ scale: 1.02, y: -2 }}

          whileTap={{ scale: 0.96 }}

          onClick={() => navigateTo('landmark')}

          className="shine relative w-full mt-4 rounded-2xl p-4 flex items-center justify-center gap-2 overflow-hidden"

          style={{

            background: 'linear-gradient(150deg, rgba(232,251,243,0.9), rgba(255,255,255,0.85))',

            border: '2px dashed #00BB78',

            boxShadow: '0 8px 20px -6px rgba(0,187,120,0.28), inset 0 1px 0 rgba(255,255,255,0.9)',

          }}

        >

          <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(140deg,#34d399,#00BB78)', boxShadow: '0 4px 10px rgba(0,187,120,0.4), inset 0 1px 0 rgba(255,255,255,0.5)' }}>

            <MapPin size={17} className="text-white" />

          </span>

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

              { step: '02', label: 'MINT', icon: '△' },

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

              Create a harvest traceability record with crop origin and declared inputs. The record is not a carbon credit or CBAM compliance certificate.

            </p>

          </div>

        </div>

      </motion.div>



      {/* ═══════════════════════ AI TOOLS ═══════════════════════ */}

      <div className="px-5 mt-4 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>

        <div className="flex items-center justify-between mb-3">

          <h2 className="text-base font-bold" style={{ color: '#001A11' }}>AI Tools</h2>

          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">✦ Gemini AI</span>

        </div>



        {/* Featured: AI Crop Doctor — large glassmorphic dark card */}

        <motion.div

          initial={{ opacity: 0, y: 12 }}

          animate={{ opacity: 1, y: 0 }}

          transition={{ delay: 0.2 }}

          whileTap={{ scale: 0.97 }}

          onClick={() => navigateTo('vision')}

          className="relative rounded-3xl overflow-hidden cursor-pointer mb-3"

          style={{

            background: 'linear-gradient(135deg, #0D0D0D 0%, #1A0A2E 50%, #0D1B2A 100%)',

            border: '1px solid rgba(139,92,246,0.3)',

            boxShadow: '0 16px 48px -8px rgba(139,92,246,0.25)',

          }}

        >

          {/* Purple/pink ambient blobs */}

          <div className="absolute inset-0 pointer-events-none overflow-hidden">

            <motion.div

              animate={{ x: [0,20,0], y: [0,-15,0] }}

              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}

              className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-25"

              style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)', transform: 'translate(25%, -25%)' }}

            />

            <motion.div

              animate={{ x: [0,-10,0], y: [0,18,0] }}

              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}

              className="absolute bottom-0 left-0 w-36 h-36 rounded-full opacity-15"

              style={{ background: 'radial-gradient(circle, #EC4899, transparent 70%)' }}

            />

          </div>

          <div className="relative z-10 p-5 flex items-center justify-between">

            <div>

              <div className="flex items-center gap-2 mb-2">

                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', boxShadow: '0 4px 12px rgba(124,58,237,0.45)' }}>

                  <Brain size={16} className="text-white" />

                </div>

                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">AI Crop Doctor</span>

              </div>

              <h3 className="text-lg font-black text-white leading-tight">

                Scan &amp; Detect{' '}

                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #A78BFA, #F9A8D4)' }}>

                  Disease Instantly

                </span>

              </h3>

              <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Upload photo · Get diagnosis · Treatment plan</p>

              <div className="flex items-center gap-1.5 mt-3">

                <span className="text-xs font-bold text-purple-400">Scan Now</span>

                <ArrowUpRight size={13} className="text-purple-400" />

              </div>

            </div>

            <div className="text-5xl flex-shrink-0 ml-3">🔬</div>

          </div>

        </motion.div>



        {/* 2-column: AI Chat + Voice AI */}

        <div className="grid grid-cols-2 gap-3 mb-4">

          {/* AI Chat */}

          <motion.div

            initial={{ opacity: 0, y: 10 }}

            animate={{ opacity: 1, y: 0 }}

            transition={{ delay: 0.28 }}

            whileTap={{ scale: 0.96 }}

            onClick={() => navigateTo('chat')}

            className="relative rounded-2xl overflow-hidden cursor-pointer"

            style={{ background: 'linear-gradient(135deg, #0C4A6E, #0284C7)', border: '1px solid rgba(56,189,248,0.3)', boxShadow: '0 10px 30px -5px rgba(2,132,199,0.35)', minHeight: 110 }}

          >

            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, white, transparent 70%)', transform: 'translate(40%,-40%)' }} />

            <div className="p-4 relative z-10">

              <div className="text-3xl mb-2">🤖</div>

              <p className="text-sm font-black text-white">AI Advisory</p>

              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Ask anything</p>

              <div className="flex items-center gap-1 mt-2">

                <span className="relative inline-flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" /></span>

                <span className="text-[9px] text-sky-300 font-bold">Online</span>

              </div>

            </div>

          </motion.div>



          {/* Voice AI */}

          <motion.div

            initial={{ opacity: 0, y: 10 }}

            animate={{ opacity: 1, y: 0 }}

            transition={{ delay: 0.34 }}

            whileTap={{ scale: 0.96 }}

            onClick={() => navigateTo('live-audio')}

            className="relative rounded-2xl overflow-hidden cursor-pointer"

            style={{ background: 'linear-gradient(135deg, #064E3B, #059669)', border: '1px solid rgba(52,211,153,0.3)', boxShadow: '0 10px 30px -5px rgba(5,150,105,0.35)', minHeight: 110 }}

          >

            {/* Waveform bg */}

            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">

              <div className="flex gap-1 items-center">

                {[...Array(8)].map((_, i) => (

                  <motion.div key={i} animate={{ scaleY: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}

                    className="w-1.5 rounded-full bg-white" style={{ height: 28 }} />

                ))}

              </div>

            </div>

            <div className="p-4 relative z-10">

              <div className="text-3xl mb-2">🎙</div>

              <p className="text-sm font-black text-white">Voice AI</p>

              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Speak in Hindi</p>

              <div className="flex items-center gap-1 mt-2">

                <span className="relative inline-flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>

                <span className="text-[9px] text-emerald-300 font-bold">8 Languages</span>

              </div>

            </div>

          </motion.div>

        </div>

      </div>



      {/* ═══════════════════════ SERVICES ═══════════════════════ */}

      <div className="px-5 mt-0 mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>

        <div className="flex items-center justify-between mb-4">

          <h2 className="text-base font-bold" style={{ color: '#001A11' }}>Services</h2>

          <span className="text-[11px] font-semibold" style={{ color: '#00BB78' }}>9 tools</span>

        </div>



        {/* ΓöÇΓöÇ ROW 1: Two featured large 3D cards ΓöÇΓöÇ */}

        <div className="grid grid-cols-1 gap-3 mb-3" style={{ perspective: '900px' }}>

          <Tilt3D maxTilt={5} onClick={() => navigateTo('market' as Screen)} className="rounded-3xl">

            <div variants={itemVariants} className="relative flex flex-col justify-center p-5 rounded-3xl text-left overflow-hidden shine"

              style={{ minHeight: 120, background: 'linear-gradient(150deg, #0e3322 0%, #001A11 60%, #04240f 100%)', border: '1px solid rgba(52,211,153,0.25)', boxShadow: '0 14px 30px -8px rgba(0,26,17,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' }}

            >

              {/* ambient glow blob */}

              <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, #00BB78, transparent 70%)' }} />

              <div className="flex items-center gap-4 relative z-10">

                <div className="w-14 h-14 rounded-2xl flex items-center justify-center icon-chip-3d flex-shrink-0" style={{ background: 'linear-gradient(140deg, #34d399, #059669)', boxShadow: '0 6px 14px rgba(0,187,120,0.45), inset 0 1px 0 rgba(255,255,255,0.5)' }}>

                  <TrendingUp size={24} className="text-white" />

                </div>

                <div>

                  <p className="text-[17px] font-black text-white leading-tight">Live Market Prices</p>

                  <p className="text-[12px] mt-1" style={{ color: '#A5FFA7' }}>Check Mandi rates across India</p>

                </div>

              </div>

            </div>

          </Tilt3D>

        </div>



        {/* ΓöÇΓöÇ ROW 2: 2├ù2 grid ΓÇö raised 3D tiles ΓöÇΓöÇ */}

        <div className="grid grid-cols-2 gap-3 mb-3" style={{ perspective: '900px' }}>

          {[

            { icon: <BookOpen size={16} strokeWidth={2} />, label: 'Govt Schemes', desc: 'Subsidies & loans', screen: 'scheme-setu', iconBg: 'linear-gradient(140deg,#cbd5e1,#94a3b8)', iconColor: '#1e293b' },

            { icon: <Umbrella size={16} strokeWidth={2} />, label: 'Crop Insurance', desc: 'Protect your yield', screen: 'insurance', iconBg: 'linear-gradient(140deg,#bae6fd,#38bdf8)', iconColor: '#075985' },

            { icon: <Activity size={16} strokeWidth={2} />, label: 'Soil Carbon', desc: 'SOC modeling', screen: 'soil-carbon', iconBg: 'linear-gradient(140deg,#6ee7b7,#10b981)', iconColor: '#065f46' },

            { icon: <Sprout size={16} strokeWidth={2} />, label: 'Carbon Vault', desc: 'Credit management', screen: 'carbon-vault', iconBg: 'linear-gradient(140deg,#86efac,#22c55e)', iconColor: '#14532d' },

          ].map((s, i) => (

            <Tilt3D key={i} maxTilt={10} onClick={() => navigateTo(s.screen as Screen)} className="rounded-2xl">

              <div variants={itemVariants} className="surface-3d flex flex-col gap-3 p-3.5 rounded-2xl text-left h-full">

                <div className="w-9 h-9 rounded-xl flex items-center justify-center icon-chip-3d" style={{ background: s.iconBg, color: s.iconColor }}>

                  {s.icon}

                </div>

                <div>

                  <p className="text-[12px] font-bold leading-tight" style={{ color: '#001A11' }}>{s.label}</p>

                  <p className="text-[10px] mt-0.5" style={{ color: '#616B68' }}>{s.desc}</p>

                </div>

              </div>

            </Tilt3D>

          ))}

        </div>



        {/* ΓöÇΓöÇ ROW 3: Compact list ΓÇö glass panel ΓöÇΓöÇ */}

        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.92), rgba(240,250,245,0.85))', border: '1px solid #E4EFE8', boxShadow: 'var(--shadow-soft), var(--inner-glow)' }}>

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

              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-emerald-50/60 transition-colors"

              style={{ borderBottom: i < 2 ? '1px solid #EDF5EF' : 'none' }}

            >

              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(140deg,#e8fbf3,#d1f5e4)', color: '#059669', boxShadow: '0 3px 8px rgba(0,187,120,0.18), inset 0 1px 0 rgba(255,255,255,0.9)' }}>

                {s.icon}

              </div>

              <div className="flex-1">

                <p className="text-[13px] font-semibold" style={{ color: '#001A11' }}>{s.label}</p>

                <p className="text-[11px]" style={{ color: '#616B68' }}>{s.desc}</p>

              </div>

              <ChevronRight size={14} style={{ color: '#00BB78', flexShrink: 0 }} />

            </motion.button>

          ))}

        </div>

      </div>



      {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

          COMMODITIES & FOOD

      ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}

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

                whileHover={{ y: -5, scale: 1.06, rotateX: 10 }}

                whileTap={{ scale: 0.93 }}

                className="snap-start flex flex-col gap-2 flex-shrink-0 cursor-pointer group"

                style={{ transformStyle: 'preserve-3d' }}

              >

                <div className="w-[68px] h-[68px] rounded-full overflow-hidden border-2 border-white relative"

                  style={{ boxShadow: '0 8px 20px rgba(0,60,30,0.22), 0 2px 6px rgba(0,60,30,0.15), inset 0 0 0 1px rgba(255,255,255,0.4)' }}>

                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all z-10"></div>

                  {/* glossy sphere highlight */}

                  <div className="absolute top-1 left-2 w-5 h-3 rounded-full bg-white/50 blur-[3px] z-20 pointer-events-none"></div>

                  <CropThumbnail crop={crop} />

                </div>

                <span className="text-xs font-semibold text-gray-700 text-center">{crop}</span>

              </motion.div>

            ))}

          </div>

        </motion.div>

      )}



      {/* ══════════════════════════════════════════════════════════════════════════════════

          MY FIELDS

      ══════════════════════════════════════════════════════════════════════════════════ */}

      <div className="mt-6 px-5 pb-4" style={{ fontFamily: 'Inter, sans-serif' }}>

        <div className="mb-4 flex items-center justify-between gap-3">

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold" style={{ color: '#001A11' }}>My Fields</h2>
              {userPlots.length > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{userPlots.length}</span>}
            </div>
            <p className="mt-0.5 text-[11px] text-gray-500">Your land, all in one place</p>
          </div>

          <button

            onClick={() => navigateTo('landmark')}

            className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"

          >

            <Plus size={14} strokeWidth={2.5} /> Add field

          </button>

        </div>



        {isLoadingPlots && (

          <div className="flex items-center gap-3 p-5 bg-gray-50 border border-gray-100 rounded-2xl">

            <div className="w-5 h-5 border-2 border-gray-200 border-t-[#00BB78] rounded-full animate-spin flex-shrink-0" />

            <span className="text-sm font-medium" style={{ color: '#616B68' }}>Loading your plotsΓÇª</span>

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

          <div className="space-y-4" style={{ perspective: '1000px' }}>

            {userPlots.map((plot) => (

              <Tilt3D key={plot.id} maxTilt={4} className="rounded-[1.5rem]">

                <motion.div variants={itemVariants} className="surface-3d overflow-hidden rounded-[1.5rem] border border-emerald-100/80 bg-white shadow-[0_12px_28px_-18px_rgba(6,78,59,0.42)]">

                  {/* Field image */}

                  <div className="relative h-40 w-full overflow-hidden bg-emerald-900 sm:h-44">

                    <motion.img

                      src={plot.image_url || getFieldImage(plot.id)}

                      alt={plot.name}

                      loading="lazy"

                      onError={(event) => {
                        const imageElement = event.currentTarget;
                        if (imageElement.dataset.fallbackApplied === 'true') {
                          imageElement.style.opacity = '0';
                          return;
                        }
                        imageElement.dataset.fallbackApplied = 'true';
                        imageElement.src = getFieldImage(plot.id);
                      }}

                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"

                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-black/10" />

                    <div className="absolute left-3.5 top-3.5 flex max-w-[70%] items-center gap-1.5 rounded-full border border-white/25 bg-black/25 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur-md">
                      <MapPin size={11} className="shrink-0 text-emerald-200" />
                      <span className="truncate">{plot.crop_type || 'Farm plot'}</span>
                    </div>

                    <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3">

                      <div className="min-w-0">

                        <h3 className="truncate text-base font-extrabold tracking-tight text-white drop-shadow-md">{plot.name}</h3>

                        <div className="mt-1 flex items-center gap-1.5">

                          <MapPin size={11} className="shrink-0 text-emerald-200" />

                          <span className="truncate text-[11px] text-white/85">{plotLocationNames[plot.id] || 'Locating…'}</span>

                        </div>

                      </div>

                      <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/35 bg-emerald-700/85 px-3 py-1.5 shadow-lg backdrop-blur-md">

                        <Leaf size={12} className="text-emerald-100" />

                        <span className="text-xs font-bold text-white">{Number(plot.area || 0).toFixed(2)} ha</span>

                      </div>

                    </div>

                  </div>



                  {/* Action row */}

                  <div className="grid grid-cols-3 bg-white px-2 py-2">

                    {[

                      { icon: <MapPin size={15} />, label: 'Open map', action: () => navigateTo('map') },

                      { icon: <BarChart2 size={15} />, label: 'Field health', action: () => navigateTo('field-monitor', { plotId: plot.id }) },

                      { icon: <TrendingUp size={15} />, label: 'Yield outlook', action: () => navigateTo('forecast') },

                    ].map((btn, i) => (

                      <button

                        key={btn.label}

                        onClick={btn.action}

                        className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl py-2.5 transition-colors hover:bg-emerald-50 active:scale-95"

                        style={{ borderRight: i < 2 ? '1px solid #EDF5EF' : 'none', color: '#00BB78' }}

                      >

                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-100">{btn.icon}</span>

                        <span className="max-w-full truncate px-1 text-[9px] font-bold text-gray-600">{btn.label}</span>

                      </button>

                    ))}

                  </div>

                </motion.div>

              </Tilt3D>

            ))}

          </div>

        )}

      </div>



      {/* ΓöÇΓöÇ Location Picker Modal ΓöÇΓöÇ */}

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

                          <p className="text-xs" style={{ color: '#616B68' }}>{city.country} &middot; {city.latitude?.toFixed(2)}&#176;N, {city.longitude?.toFixed(2)}&#176;E</p>

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

    </div>

  );

};



export default DashboardScreen;

