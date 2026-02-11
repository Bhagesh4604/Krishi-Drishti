import React, { useState, useEffect } from 'react';
import { Screen, UserProfile, Language } from '../types';
import {
  CloudSun,
  MapPin,
  MoreHorizontal,
  ArrowRight,
  Droplets,
  Wind,
  Sun,
  Leaf,
  Plus,
  Zap,
  BookOpen,
  Sprout,
  Users,
  Coins,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  ScanLine,
  ThermometerSun,
  Calendar,
  CloudRain
} from 'lucide-react';
import { weatherService } from '../src/services/api';

interface DashboardScreenProps {
  navigateTo: (screen: Screen) => void;
  user: UserProfile | null;
  t: any;
  onLangChange: (lang: Language) => void;
  currentLang: Language;
}

import VoiceAssistantModal from '../components/VoiceAssistantModal';
import WeatherModal from '../components/WeatherModal';

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigateTo, user, t, currentLang }) => {
  const [weather, setWeather] = useState<any>(null);
  const [locationName, setLocationName] = useState<string>("Locating...");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const lat = user?.location?.lat || 21.1458;
        const lng = user?.location?.lng || 79.0882;

        // Parallel fetch
        const [weatherData, locData] = await Promise.all([
          weatherService.getWeather(lat, lng),
          weatherService.reverseGeocode(lat, lng)
        ]);

        setWeather(weatherData);
        if (locData && (locData.city || locData.district)) {
          setLocationName(`${locData.city || ''}${locData.city && locData.district ? ', ' : ''}${locData.district || ''}`);
        } else {
          setLocationName("Nagpur, MH"); // Fallback
        }
      } catch (e) {
        console.error("Dashboard load", e);
        setLocationName("Nagpur, MH");
      }
    };
    loadData();
  }, [user]);

  const crops = user?.crops && Array.isArray(user.crops) ? user.crops : ['Wheat', 'Grapes', 'Potato', 'Corn'];

  // Helper to map WMO codes to text
  const getWeatherDescription = (code: number) => {
    if (code === 0) return "Clear Sky";
    if (code === 1 || code === 2 || code === 3) return "Partly Cloudy";
    if (code === 45 || code === 48) return "Foggy";
    if (code >= 51 && code <= 67) return "Rainy";
    if (code >= 71 && code <= 77) return "Snowy";
    if (code >= 80 && code <= 82) return "Heavy Rain";
    if (code >= 95) return "Thunderstorm";
    return "Sunny";
  };

  const currentTemp = weather?.current?.temperature_2m ? Math.round(weather.current.temperature_2m) : 32;
  const growthStatus = currentTemp > 20 && currentTemp < 35 ? "Good Growth" : (currentTemp > 35 ? "Heat Stress" : "Cold Stress");

  return (
    <div className="min-h-full bg-gray-50 relative pb-28 font-sans">

      {/* 1. Immersive Header with Background Image */}
      <div className="relative h-[380px] w-full bg-stone-900 rounded-b-[3rem] overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1932&auto=format&fit=crop)', // Sunset Field
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />

        {/* Top Bar */}
        <div className="relative z-10 px-6 pt-12 flex justify-between items-start">
          <div>
            <p className="text-white/80 text-sm font-medium mb-1">Hello, {user?.name?.split(' ')[0] || 'Jonathan'}!</p>
            <p className="text-white/60 text-xs">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden bg-white/10 backdrop-blur-sm">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative z-10 px-6 mt-6">
          <h1 className="text-3xl text-white font-light leading-tight">
            Farming Made <br />
            <span className="font-bold text-yellow-400">Simple & Smart</span>
          </h1>
        </div>


      </div>

      {/* 2. Weather Pill (Click to Open Modular UI) */}
      <div className="px-6 -mt-16 relative z-20 flex justify-end">
        <button
          onClick={() => setShowWeatherModal(true)}
          className="bg-white/90 backdrop-blur-md border border-white/50 rounded-full px-4 py-2 shadow-lg flex items-center gap-3 active:scale-95 transition-transform"
        >
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-gray-500 uppercase">{locationName.split(',')[0]}</span>
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold text-gray-900">{currentTemp}°</span>
              {weather?.current?.weather_code > 3 ? <CloudRain size={16} className="text-blue-500" /> : <Sun size={16} className="text-orange-500" />}
            </div>
          </div>
        </button>
      </div>

      {showWeatherModal && (
        <WeatherModal
          weather={weather}
          locationName={locationName}
          onClose={() => setShowWeatherModal(false)}
        />
      )}

      {/* 4. Quick Actions Grid (Services) - NEW */}
      <div className="px-6 mt-8">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold text-gray-900">Services</h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: <TrendingUp size={20} />, label: 'Market', color: 'bg-blue-50 text-blue-600', screen: 'market' },
            { icon: <ScanLine size={20} />, label: 'Scanner', color: 'bg-green-50 text-green-600', screen: 'vision' },
            { icon: <BookOpen size={20} />, label: 'Schemes', color: 'bg-orange-50 text-orange-600', screen: 'scheme-setu' },
            { icon: <Coins size={20} />, label: 'Finance', color: 'bg-purple-50 text-purple-600', screen: 'finance' },
            { icon: <Sprout size={20} />, label: 'Carbon', color: 'bg-emerald-50 text-emerald-600', screen: 'carbon-vault' },
            { icon: <Zap size={20} />, label: 'Forecast', color: 'bg-yellow-50 text-yellow-600', screen: 'forecast' },
            { icon: <MoreHorizontal size={20} />, label: 'More', color: 'bg-gray-50 text-gray-600', screen: 'profile' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigateTo(item.screen as Screen)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${item.color} group-active:scale-95 transition-transform`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-bold text-gray-600">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. My Fields Section (Moved down slightly or kept same) */}
      <div className="px-6 mt-8">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold text-gray-900">My Fields</h2>
          <button className="text-xs font-bold text-gray-500 hover:text-green-600">See all &gt;</button>
        </div>

        {/* Crop Chips */}
        <div className="flex gap-3 mb-6 overflow-x-auto no-scrollbar">
          {crops.slice(0, 4).map((crop: string, i: number) => (
            <button
              key={i}
              className={`px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold whitespace-nowrap transition-all ${i === 0 ? 'bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-400/20' : 'bg-white text-gray-500 shadow-sm border border-gray-100'}`}
            >
              <div className="w-4 h-4 rounded-full bg-black/10" />
              {crop}
            </button>
          ))}
          <button
            onClick={() => navigateTo('profile')}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Large Field Card */}
        <div className="relative w-full h-64 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-green-900/10 group active:scale-95 transition-all">
          <img
            src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800" // Wheat field aerial
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            alt="Field"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          <div className="absolute top-4 left-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
            ★ 4.5
          </div>

          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md rounded-full p-2 text-white hover:bg-white hover:text-red-500 transition-colors">
            <Leaf size={18} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">
                  <MapPin size={10} className="inline mr-1" />
                  Emerald Valley Plot F5
                </p>
                <h3 className="text-2xl font-bold text-white mb-1">Wheat Field</h3>
                <div className="flex items-center gap-4 text-white/80 text-xs">
                  <span className="flex items-center gap-1"><Droplets size={12} className="text-blue-400" /> 45%</span>
                  <span className="flex items-center gap-1"><Wind size={12} className="text-gray-400" /> 12km/h</span>
                </div>
              </div>
              <button
                onClick={() => navigateTo('vision')}
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-900 shadow-lg hover:bg-green-400 hover:text-white transition-all transform hover:-rotate-45"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Live Market Trends - NEW */}
      <div className="px-6 mt-8">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold text-gray-900">Live Mandi Rates</h2>
          <button onClick={() => navigateTo('market')} className="text-xs font-bold text-green-600">View All</button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {[
            { crop: 'Wheat', price: '₹2,125', change: '+2.4%', up: true },
            { crop: 'Soybean', price: '₹3,850', change: '-1.2%', up: false },
            { crop: 'Cotton', price: '₹6,200', change: '+0.8%', up: true },
            { crop: 'Onion', price: '₹1,400', change: '+5.1%', up: true },
          ].map((item, i) => (
            <div key={i} className="min-w-[140px] bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-gray-500">{item.crop}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {item.change}
                </span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-lg font-black text-gray-900">{item.price}</span>
                <span className="text-[10px] text-gray-400 mb-1">/Qtl</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Featured Scheme Banner - NEW */}
      <div className="px-6 mt-8 mb-4">
        <div
          onClick={() => navigateTo('scheme-setu')}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2rem] p-6 relative overflow-hidden shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <div className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg inline-block mb-2">New Scheme</div>
              <h3 className="text-xl font-bold text-white mb-1">PM-KISAN Update</h3>
              <p className="text-indigo-100 text-xs max-w-[200px]">Check your eligibility for the next installment.</p>
            </div>
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
              <ArrowRight size={20} className="text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) - Voice Assistant */}
      <button
        onClick={() => setIsVoiceActive(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex items-center justify-center active:scale-90 transition-transform z-50 border-4 border-white/20"
      >
        <MessageCircle size={24} />
      </button>

      <VoiceAssistantModal
        isOpen={isVoiceActive}
        onClose={() => setIsVoiceActive(false)}
        language={currentLang}
      />

    </div>
  );
};

export default DashboardScreen;
