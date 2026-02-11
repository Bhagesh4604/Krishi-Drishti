import React, { useState, useEffect } from 'react';
import { Screen, UserProfile, Language } from '../types';
import {
  CloudSun,
  Camera,
  Search,
  TrendingUp,
  Newspaper,
  Mic,
  Zap,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Plus,
  Leaf,
  Store,
  BookOpen,
  CloudRain,
  Sun,
  Sprout,
  Bell
} from 'lucide-react';
import { languages } from '../translations';
import { newsService, schemesService, weatherService } from '../src/services/api';

interface DashboardScreenProps {
  navigateTo: (screen: Screen) => void;
  user: UserProfile | null;
  t: any;
  onLangChange: (lang: Language) => void;
  currentLang: Language;
}

const getCropImage = (cropName: string) => {
  const lower = cropName.toLowerCase();
  if (lower.includes('cotton')) return '/assets/crops/cotton.jpg';
  if (lower.includes('soybean')) return '/assets/crops/soybean.jpg';
  if (lower.includes('sugarcane')) return '/assets/crops/sugarcane.jpg';
  return 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&fit=crop';
};

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigateTo, user, t, onLangChange, currentLang }) => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const crops = Array.isArray(user?.crops) ? user?.crops : (user?.crops ? [user?.crops] : ['Cotton', 'Soybean', 'Wheat']);

  useEffect(() => {
    const loadData = async () => {
      try {
        const lat = user?.location?.lat || 21.1458;
        const lng = user?.location?.lng || 79.0882;
        const weatherData = await weatherService.getWeather(lat, lng);
        setWeather(weatherData);
      } catch (e) {
        console.error("Dashboard load failed", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  return (
    <div className="min-h-full bg-[#E9F3E6] relative pb-28 font-sans">

      {/* 1. Header */}
      <div className="px-6 pt-12 pb-4 flex justify-between items-center bg-white shadow-sm sticky top-0 z-20 rounded-b-[2rem]">
        {/* Left: Logo & Welcome */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 shadow-sm border border-green-200">
            <Leaf size={20} fill="currentColor" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-0.5">Welcome</p>
            <h1 className="text-lg font-black text-gray-900 leading-none">{user?.name?.split(' ')[0] || 'Farmer'}</h1>
          </div>
        </div>

        {/* Right: Weather, Lang, Notif */}
        <div className="flex items-center gap-3">
          {/* Weather Pill (Small) */}
          <div className="flex flex-col items-end mr-1">
            <div className="flex items-center gap-1 text-gray-700">
              <CloudSun size={16} className="text-amber-500" />
              <span className="text-xs font-bold">{weather?.current?.temperature_2m || '--'}°C</span>
            </div>
            <span className="text-[9px] text-gray-400 font-medium">{user?.district || 'Nagpur'}</span>
          </div>

          {/* Language Selector */}
          <button
            onClick={() => onLangChange(currentLang === 'en' ? 'hi' : 'en')}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100 active:bg-gray-100"
          >
            <span className="text-xs font-bold uppercase">{currentLang}</span>
          </button>

          {/* Notification */}
          <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100 active:bg-gray-100 relative">
            <Bell size={16} />
            <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
          </button>
        </div>
      </div>

      <div className="px-6 space-y-6">


        {/* 3. Crop Health Section */}
        <div className="bg-white rounded-[2rem] p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Crop Health</h3>
              <p className="text-green-600 text-sm font-medium">Good</p>
            </div>
            <button
              onClick={() => navigateTo('vision')}
              className="text-gray-400 hover:text-green-600 transition-colors"
            >
              <Search size={22} />
            </button>
          </div>

          {/* Crops Horizontal List */}
          <div className="flex justify-between px-2 gap-4 overflow-x-auto no-scrollbar">
            {crops.length > 0 ? crops.map((crop: string, idx: number) => (
              <div key={idx} className="flex flex-col items-center gap-3 min-w-[64px]">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md">
                  <img src={getCropImage(crop)} alt={crop} className="w-full h-full object-cover" />
                </div>
                <div className="text-center w-full">
                  <p className="text-sm font-bold text-gray-800 mb-1 truncate w-full">{crop}</p>
                  {/* Health Bar */}
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${idx === 0 ? 'bg-green-400 w-3/4' : idx === 1 ? 'bg-yellow-400 w-1/2' : 'bg-green-500 w-full'}`}></div>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-gray-400 text-sm w-full text-center py-4">Add crops in profile</p>
            )}
          </div>
        </div>

        {/* 4. Your Crops / Services Header */}
        <div>
          <h3 className="text-gray-800 font-bold text-base mb-4">Your Services</h3>

          {/* Split Row: Mandi & Forecast */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              onClick={() => navigateTo('market')}
              className="bg-white p-4 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-2 aspect-[4/3] active:scale-95 transition-all"
            >
              <Store className="text-green-600" size={32} />
              <span className="text-sm font-bold text-gray-800">Mandi Services</span>
              <div className="w-8 h-1 bg-gray-100 rounded-full mt-1"></div>
            </button>

            <button
              onClick={() => navigateTo('forecast')}
              className="bg-white p-4 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-2 aspect-[4/3] active:scale-95 transition-all"
            >
              <TrendingUp className="text-green-500" size={32} />
              <span className="text-sm font-bold text-gray-800 text-center">Market Forecast</span>
            </button>
          </div>

          {/* 3-Col Grid: Finance, My Schemes, Knowledge Hub */}
          <div className="grid grid-cols-3 gap-3">
            <ServiceItem
              icon={ShieldCheck}
              label="Finance"
              onClick={() => navigateTo('finance')}
              color="text-green-700"
            />
            <ServiceItem
              icon={Zap}
              label="My Schemes"
              onClick={() => navigateTo('scheme-setu')}
              color="text-green-600"
            />
            <ServiceItem
              icon={BookOpen}
              label="Knowledge Hub"
              onClick={() => navigateTo('social')}
              color="text-green-800"
            />
          </div>
        </div>

      </div>

    </div>
  );
};

const ServiceItem = ({ icon: Icon, label, onClick, color }: any) => (
  <button
    onClick={onClick}
    className="bg-white p-4 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-3 aspect-square active:scale-95 transition-all"
  >
    <Icon size={24} className={color} strokeWidth={1.5} />
    <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">{label}</span>
  </button>
);

export default DashboardScreen;
