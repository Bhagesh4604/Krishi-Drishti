import React, { useState, useEffect } from 'react';
import { Screen, UserProfile, Language } from '../types';
import { languages } from '../translations';
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

  useEffect(() => {
    const fetchPlots = async () => {
      try {
        const data = await plotService.getPlots();
        setUserPlots(data);

        // Fetch location names for ALL plots that have coordinates
        const locationPromises = data.map(async (plot: any) => {
          if (plot.coordinates && plot.coordinates.length > 0) {
            const firstCoord = plot.coordinates[0];
            try {
              const locData = await weatherService.reverseGeocode(firstCoord.lat, firstCoord.lng);
              if (locData && (locData.city || locData.district)) {
                return { id: plot.id, name: `${locData.city || ''}${locData.city && locData.district ? ', ' : ''}${locData.district || ''}` };
              }
            } catch (locErr) {
              console.error(`Failed to reverse geocode plot ${plot.id}:`, locErr);
            }
          }
          return { id: plot.id, name: locationName.split(',')[0] || 'Unknown Location' };
        });

        const resolvedLocations = await Promise.all(locationPromises);
        const locationMap: { [key: number]: string } = {};
        resolvedLocations.forEach(loc => {
          if (loc) locationMap[loc.id] = loc.name;
        });
        setPlotLocationNames(locationMap);

      } catch (error) {
        console.error('Failed to fetch user plots:', error);
      } finally {
        setIsLoadingPlots(false);
      }
    };
    fetchPlots();
  }, [locationName]);

  const currentTemp = weather?.current?.temperature_2m ? Math.round(weather.current.temperature_2m) : 32;

  const crops = user?.crops && Array.isArray(user.crops) ? user.crops : ['Wheat', 'Corn', 'Grapes', 'Potato', 'Olive'];

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

  return (
    <div className="min-h-full pb-24 font-sans text-gray-800 relative bg-white">

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

        <div className="flex items-center gap-3 relative">
          <button
            className="p-3 bg-white rounded-full shadow-lg shadow-orange-100/50 relative hover:bg-orange-50 transition-colors active:scale-95"
            onClick={() => setShowLangMenu(!showLangMenu)}
          >
            <span className="sr-only">Change Language</span>
            <div className={`w-5 h-5 flex items-center justify-center font-bold text-xs border-2 rounded-full transition-colors ${showLangMenu ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-900 border-gray-900'}`}>
              {currentLang.toUpperCase()}
            </div>
          </button>

          {showLangMenu && (
            <>
              {/* Backdrop to close */}
              <div
                className="fixed inset-0 z-[60]"
                onClick={() => {
                  console.log("Backdrop clicked -> Closing");
                  setShowLangMenu(false);
                }}
              />
              {/* Dropdown Menu */}
              <div
                className="absolute top-full mt-2 right-12 bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 z-[70] w-48 max-h-80 overflow-y-auto"
                style={{ minWidth: '200px' }}
              >
                <div className="px-3 py-2 border-b border-gray-100 mb-1">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Language ({languages.length})</span>
                </div>
                {languages.map((lang: any) => (
                  <button
                    key={lang.code}
                    className={`w-full text-left px-3 py-3 rounded-xl text-sm font-bold flex justify-between items-center transition-all mb-1 ${currentLang === lang.code
                      ? 'bg-green-50 text-green-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => {
                      console.log("Selected language:", lang.code);
                      onLangChange(lang.code as Language);
                      setShowLangMenu(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span>{lang.label}</span>
                      <span className="text-[10px] font-medium text-gray-400">{lang.native}</span>
                    </div>
                    {currentLang === lang.code && <div className="w-2 h-2 rounded-full bg-green-500 shadow-green-200 shadow-lg" />}
                  </button>
                ))}
              </div>
            </>
          )}
          <button
            className="p-3 bg-white rounded-full shadow-lg shadow-orange-100/50 relative hover:bg-orange-50 transition-colors active:scale-95"
            onClick={() => { }}
          >
            <div className="w-2 h-2 bg-black rounded-full absolute top-3 right-3 border border-white pointer-events-none" />
            <Bell size={20} className="text-gray-900" fill="black" />
          </button>
        </div>
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

      {/* Carbon Wallet Integration */}
      <div className="mx-6 mb-6">
        <CarbonWalletCard />

        {/* Quick Action to Mark Land */}
        <button
          onClick={() => navigateTo('landmark')}
          className="w-full mt-4 bg-white border-2 border-green-600 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
        >
          <MapPin size={20} className="text-green-700" />
          <span className="font-bold text-green-800">Locate My Farm Boundary</span>
        </button>
      </div>

      {/* 4. Services Grid (Re-added for Navigation) */}
      <div className="px-6 mt-8 relative z-10 w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Services</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: <TrendingUp size={28} strokeWidth={1.5} />, label: 'Market', bg: 'bg-gradient-to-br from-blue-400 to-blue-600', shadow: 'shadow-blue-500/40', text: 'text-white', screen: 'market' },
            { icon: <ScanLine size={28} strokeWidth={1.5} />, label: 'Scanner', bg: 'bg-gradient-to-br from-green-400 to-green-600', shadow: 'shadow-green-500/40', text: 'text-white', screen: 'vision' },
            { icon: <BookOpen size={28} strokeWidth={1.5} />, label: 'Schemes', bg: 'bg-gradient-to-br from-orange-400 to-orange-600', shadow: 'shadow-orange-500/40', text: 'text-white', screen: 'scheme-setu' },
            { icon: <Umbrella size={28} strokeWidth={1.5} />, label: 'Insurance', bg: 'bg-gradient-to-br from-indigo-400 to-indigo-600', shadow: 'shadow-indigo-500/40', text: 'text-white', screen: 'insurance' },
            { icon: <Sprout size={28} strokeWidth={1.5} />, label: 'Carbon', bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/40', text: 'text-white', screen: 'carbon-vault' },
            { icon: <Zap size={28} strokeWidth={1.5} />, label: 'Forecast', bg: 'bg-gradient-to-br from-yellow-300 to-amber-500', shadow: 'shadow-amber-500/40', text: 'text-white', screen: 'forecast' },
            { icon: <Radio size={28} strokeWidth={1.5} />, label: 'Acoustic', bg: 'bg-gradient-to-br from-rose-400 to-rose-600', shadow: 'shadow-rose-500/40', text: 'text-white', screen: 'acoustic-scanner' },
            { icon: <MoreHorizontal size={28} strokeWidth={1.5} />, label: 'More', bg: 'bg-gradient-to-br from-gray-100 to-gray-300', shadow: 'shadow-gray-400/40', text: 'text-gray-700', screen: 'profile' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigateTo(item.screen as Screen)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-[60px] h-[60px] rounded-[1.2rem] flex items-center justify-center shadow-lg border border-white/80 ${item.bg} ${item.shadow} ${item.text} group-active:scale-90 group-active:opacity-80 transition-all duration-300 relative overflow-hidden`}>
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"></div>
                {item.icon}
              </div>
              <span className="text-[10px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Commodities & Food (Horizontal Scroll) */}
      <div className="px-6 mt-8 relative z-10 w-full overflow-hidden">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Commodities & Food</h2>

        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-4 pr-6">
          {['Rice', 'Corn', 'Grapes', 'Potato', 'Olive', 'Wheat'].map((crop, idx) => (
            <div key={idx} className="flex flex-col items-center gap-3 flex-shrink-0 cursor-pointer active:scale-95 transition-transform group">
              <div className="w-[72px] h-[72px] rounded-full overflow-hidden shadow-lg border-2 border-white relative">
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all z-10"></div>
                <img
                  src={getCropImage(crop)}
                  alt={crop}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 tracking-wide">{crop}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. My Fields Cards Carousel */}
      <div className="mt-4 relative z-10 pb-2 overflow-hidden w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-4 px-6">My Fields</h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 px-6 snap-x snap-mandatory">

          {isLoadingPlots && (
            <div className="min-w-[85%] snap-center bg-[#FFF8F0] rounded-[2.5rem] p-2 border border-orange-50 shadow-sm relative overflow-hidden flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                <span className="text-orange-600 font-bold text-sm">Loading Fields...</span>
              </div>
            </div>
          )}

          {!isLoadingPlots && userPlots.length === 0 && (
            <div className="min-w-[85%] snap-center bg-[#FFF8F0] rounded-[2.5rem] p-2 border border-orange-50 shadow-sm relative overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center">
                    <img src="https://images.unsplash.com/photo-1592982537447-6f23349c258d?w=400" className="w-full h-full object-cover grayscale opacity-50" alt="Empty Field" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">No Fields Added</h3>
                  </div>
                </div>
                <button onClick={() => navigateTo('landmark')} className="bg-green-100 px-4 py-2 rounded-full flex items-center gap-2 active:scale-95">
                  <Plus size={16} className="text-green-700" />
                  <span className="text-xs font-bold text-green-800">Add</span>
                </button>
              </div>
              <div className="relative h-48 rounded-[2rem] overflow-hidden group cursor-pointer active:scale-95 transition-transform" onClick={() => navigateTo('map')}>
                <img src="https://images.unsplash.com/photo-1592982537447-6f23349c258d?w=800" className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale" alt="Main Field" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
                  <p className="bg-white/90 text-gray-800 font-bold px-4 py-2 rounded-xl shadow-lg border border-white">Tap to locate your farm</p>
                </div>
              </div>
            </div>
          )}

          {!isLoadingPlots && userPlots.map((plot) => (
            <div key={plot.id} className="min-w-[85%] sm:min-w-[70%] snap-center bg-[#FFF8F0] rounded-[2.5rem] p-3 border border-orange-50 shadow-sm relative overflow-hidden flex-shrink-0 flex flex-col gap-3">

              {/* Header inside card */}
              <div className="px-3 pt-2 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center">
                    <img src={getFieldImage(plot.id)} className="w-full h-full object-cover" alt="Field" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 truncate max-w-[120px]">{plot.name}</h3>
                    <div className="flex items-center gap-1 text-gray-500 text-xs font-medium">
                      <MapPin size={12} /> {plotLocationNames[plot.id] || "Locating..."}
                    </div>
                  </div>
                </div>
                <div className="bg-[#FFE8D1] px-3 py-2 rounded-full flex items-center gap-1 shrink-0">
                  <Sprout size={16} className="text-orange-600" fill="currentColor" />
                  <span className="text-sm font-bold text-gray-900">{plot.area} ha</span>
                </div>
              </div>

              {/* Big Image Section */}
              <div className="relative h-40 rounded-[2rem] overflow-hidden group cursor-pointer active:scale-95 transition-transform w-full" onClick={() => navigateTo('map')}>
                <img
                  src={getFieldImage(plot.id)}
                  className="absolute inset-0 w-full h-full object-cover"
                  alt={plot.name}
                />
              </div>

              {/* Action Buttons Bar */}
              <div className="flex justify-between items-center bg-white rounded-[1.5rem] p-2 shadow-sm border border-orange-100 w-full mt-1">
                <button className="flex-1 flex flex-col items-center gap-1 group py-1 active:scale-95" onClick={(e) => { e.stopPropagation(); navigateTo('map'); }}>
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <MapPin size={18} className="text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">Map</span>
                </button>
                <div className="w-px h-8 bg-gray-100" />
                <button className="flex-1 flex flex-col items-center gap-1 group py-1 active:scale-95" onClick={(e) => { e.stopPropagation(); navigateTo('crop-stress'); }}>
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                    <Activity size={18} className="text-green-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">Health</span>
                </button>
                <div className="w-px h-8 bg-gray-100" />
                <button className="flex-1 flex flex-col items-center gap-1 group py-1 active:scale-95" onClick={(e) => { e.stopPropagation(); navigateTo('forecast'); }}>
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    <TrendingUp size={18} className="text-amber-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">Yield</span>
                </button>
              </div>

            </div>
          ))}

        </div>
      </div>

    </div>


  );
};



export default DashboardScreen;
