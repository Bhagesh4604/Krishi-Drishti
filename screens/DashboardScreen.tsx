import React, { useState, useEffect } from 'react';
import { Screen, UserProfile, Language } from '../types';
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
  Plus
} from 'lucide-react';
import { weatherService } from '../src/services/api';
import VoiceAssistantModal from '../components/VoiceAssistantModal';
import WeatherModal from '../components/WeatherModal';

interface DashboardScreenProps {
  navigateTo: (screen: Screen) => void;
  user: UserProfile | null;
  t: any;
  onLangChange: (lang: Language) => void;
  currentLang: Language;
  weather: any;
  locationName: string;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigateTo, user, t, currentLang, weather, locationName }) => {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);

  const currentTemp = weather?.current?.temperature_2m ? Math.round(weather.current.temperature_2m) : 32;

  const crops = user?.crops && Array.isArray(user.crops) ? user.crops : ['Wheat', 'Corn', 'Grapes', 'Potato', 'Olive'];

  const getCropImage = (crop: string) => {
    const map: any = {
      'Wheat': 'https://plus.unsplash.com/premium_photo-1675715924047-a870d17290ca?w=800',
      'Corn': 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800',
      'Grapes': 'https://images.unsplash.com/photo-1537640538965-1756fb179c26?w=800',
      'Potato': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800',
      'Olive': 'https://images.unsplash.com/photo-1471180625745-944903837c22?w=800',
      'Rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800',
    };
    return map[crop] || map['Wheat'];
  };

  return (
    <div className="min-h-full pb-32 font-sans text-gray-800 relative bg-white">

      {/* Mixed Golden/White Background - Concentrated Top Left */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-200 via-amber-50/50 to-transparent z-0 pointer-events-none" />

      {/* 1. Header Section */}
      <div className="px-6 pt-12 pb-6 flex justify-between items-start relative z-20">
        <div>
          <h1 className="text-4xl font-light text-gray-800 tracking-tight">Hello, <span className="font-bold text-gray-900">{user?.name?.split(' ')[0] || 'Harris'}</span></h1>
          <div className="flex items-center gap-1 mt-1 text-gray-600 self-start px-2 py-1 rounded-lg">
            <MapPin size={16} className="text-gray-500" fill="currentColor" />
            <span className="text-sm font-medium tracking-wide">{locationName.split(',')[0]}</span>
          </div>
        </div>
        <button
          className="p-3 bg-white rounded-full shadow-lg shadow-orange-100/50 relative hover:bg-orange-50 transition-colors active:scale-95"
          onClick={() => { }}
        >
          <div className="w-2 h-2 bg-black rounded-full absolute top-3 right-3 border border-white pointer-events-none" />
          <Bell size={20} className="text-gray-900" fill="black" />
        </button>
      </div>

      {/* 2. Weather Section (Design from Image) */}
      <div className="px-6 mb-8 relative">
        <div className="flex justify-between items-start relative z-10 mb-6">
          <div>
            <div className="flex items-start gap-2">
              <span className="text-7xl font-medium text-gray-900 tracking-tighter">{currentTemp}°</span>
              <Sun size={32} className="text-yellow-400 fill-yellow-400 mt-2" />
            </div>
            <p className="text-md font-medium text-gray-500 mt-1">
              Sonoma County
            </p>
          </div>
          {/* Wheat Stalks Image Requirement */}
          {/* Wheat Stalks Image Requirement */}
          <div className="absolute -top-60 -right-8 w-64 h-[34rem] z-0 pointer-events-none mix-blend-multiply opacity-90">
            <img
              src="/assets/crops/Wheat.jpg"
              className="w-full h-full object-contain"
              alt="Wheat"
            />
          </div>
        </div>

        {/* 2x2 Grid Pills */}
        <div className="grid grid-cols-2 gap-4 relative z-10">
          {/* Soil Temp */}
          <div className="bg-[#FFF8F0] border border-orange-100 rounded-[2rem] p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[#FFE8D1] flex items-center justify-center text-gray-700">
              <Thermometer size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Soil temp</p>
              <p className="text-lg font-bold text-gray-900">
                {weather?.current?.soil_temperature_0cm ? `+${Math.round(weather.current.soil_temperature_0cm)} C` : '+23 C'}
              </p>
            </div>
          </div>

          {/* Humidity */}
          <div className="bg-[#FFF8F0] border border-orange-100 rounded-[2rem] p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[#FFE8D1] flex items-center justify-center text-gray-700">
              <Droplets size={18} fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Humidity</p>
              <p className="text-lg font-bold text-gray-900">
                {weather?.current?.relative_humidity_2m ?? '78'}%
              </p>
            </div>
          </div>

          {/* Wind */}
          <div className="bg-[#FFF8F0] border border-orange-100 rounded-[2rem] p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[#FFE8D1] flex items-center justify-center text-gray-700">
              <Wind size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Wind</p>
              <p className="text-lg font-bold text-gray-900">
                {weather?.current?.wind_speed_10m ?? '7'} m/s
              </p>
            </div>
          </div>

          {/* Precipitation (Correcting spelling from image 'Perception') */}
          <div className="bg-[#FFF8F0] border border-orange-100 rounded-[2rem] p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[#FFE8D1] flex items-center justify-center text-gray-700">
              <CloudRain size={18} fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Precipitation</p>
              <p className="text-lg font-bold text-gray-900">
                {weather?.current?.precipitation ?? '0'} mm
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Services Grid (Re-added for Navigation) */}
      <div className="px-6 mt-8 relative z-10 w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Services</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: <TrendingUp size={22} />, label: 'Market', color: 'bg-blue-50 text-blue-600', screen: 'market' },
            { icon: <ScanLine size={22} />, label: 'Scanner', color: 'bg-green-50 text-green-600', screen: 'vision' },
            { icon: <BookOpen size={22} />, label: 'Schemes', color: 'bg-orange-50 text-orange-600', screen: 'scheme-setu' },
            { icon: <Umbrella size={22} />, label: 'Insurance', color: 'bg-purple-50 text-purple-600', screen: 'insurance' },
            { icon: <Sprout size={22} />, label: 'Carbon', color: 'bg-emerald-50 text-emerald-600', screen: 'carbon-vault' },
            { icon: <Zap size={22} />, label: 'Forecast', color: 'bg-yellow-50 text-yellow-600', screen: 'forecast' },
            { icon: <MoreHorizontal size={22} />, label: 'More', color: 'bg-gray-100 text-gray-600', screen: 'profile' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigateTo(item.screen as Screen)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center shadow-sm border border-white/50 ${item.color} group-active:scale-95 transition-all duration-300`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-900 transition-colors uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Commodities & Food (Horizontal Scroll) */}
      <div className="px-6 mt-8 relative z-10 w-full overflow-hidden">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Commodities & Food</h2>

        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 pr-6">
          {['Rice', 'Corn', 'Grapes', 'Potato', 'Olive', 'Wheat'].map((crop, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden shadow-md border-2 border-white relative group">
                <div className="absolute inset-0 bg-yellow-100/50 group-hover:bg-transparent transition-all"></div>
                <img
                  src={getCropImage(crop)}
                  alt={crop}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-sm font-medium text-gray-800">{crop}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. My Fields Card (Design from Image) */}
      <div className="px-6 mt-4 relative z-10">
        <div className="bg-[#FFF8F0] rounded-[2.5rem] p-2 border border-orange-50 shadow-sm relative overflow-hidden">

          {/* Header inside card */}
          <div className="px-4 pt-4 pb-2 flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                <img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400" className="w-full h-full object-cover" alt="Field" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">My Fields</h3>
                <div className="flex items-center gap-1 text-gray-500 text-xs font-medium">
                  <MapPin size={12} /> Sonoma County
                </div>
              </div>
            </div>
            <div className="bg-[#FFE8D1] px-4 py-2 rounded-full flex items-center gap-2">
              <Sprout size={16} className="text-orange-600" fill="currentColor" />
              <span className="text-sm font-bold text-gray-900">7200 k.g/ha</span>
            </div>
          </div>

          {/* Big Image Section */}
          <div className="relative h-48 rounded-[2rem] overflow-hidden group cursor-pointer active:scale-95 transition-transform" onClick={() => navigateTo('vision')}>
            <img
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"
              className="absolute inset-0 w-full h-full object-cover"
              alt="Main Field"
            />

            {/* Floating Bottom Dock (Internal Navigation) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md rounded-full px-2 py-2 flex items-center gap-2 shadow-2xl border border-white/10">
              <button className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white border border-white/20">
                <Home size={18} fill="white" />
              </button>
              <button className="w-12 h-12 rounded-full bg-[#FFE8D1] flex items-center justify-center text-black">
                <Leaf size={20} fill="black" />
              </button>
              <button className="w-12 h-12 rounded-full bg-[#FFE8D1] flex items-center justify-center text-black">
                <UserIcon /> {/* Using custom or simple icon */}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for AI (Corner) */}
      <button
        onClick={() => setIsVoiceActive(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-50 border-4 border-white/20"
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

// Simple User Icon Component
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="black" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

export default DashboardScreen;
