
import React, { useState, useEffect } from 'react';
import { COLORS } from '../constants';
import { Screen, UserProfile, Language } from '../types';
import {
  CloudSun,
  Camera,
  MessageCircle,
  Map as MapIcon,
  ChevronRight,
  Bell,
  Globe,
  Search,
  ShieldCheck,
  Landmark,
  Sparkles,
  TrendingUp,
  Info,
  Loader2,
  Newspaper,
  Mic,
  Radio,
  Zap,
  Calendar,
  ExternalLink,
  Gift,
  FileText,
  Users,
  Activity
} from 'lucide-react';
import { languages } from '../translations';
import { GoogleGenAI } from '@google/genai';

interface SchemeAlert {
  id: string;
  title: string;
  description: string;
  tag: 'NEW' | 'EXPIRING' | 'URGENT';
  deadline?: string;
}

interface DashboardScreenProps {
  navigateTo: (screen: Screen) => void;
  user: UserProfile | null;
  t: any;
  onLangChange: (lang: Language) => void;
  currentLang: Language;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigateTo, user, t, onLangChange, currentLang }) => {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [liveNews, setLiveNews] = useState<string | null>(null);
  const [loadingNews, setLoadingNews] = useState(false);
  const [schemes, setSchemes] = useState<SchemeAlert[]>([]);
  const [loadingSchemes, setLoadingSchemes] = useState(false);

  const fetchLiveInsights = async () => {
    setLoadingNews(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Find the 2 most important agricultural news or price trends for ${user?.district || 'Maharashtra'} today. Keep it short and in ${languages.find(l => l.code === currentLang)?.label}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are an agricultural news curator. Provide only factual, search-grounded updates."
        }
      });
      setLiveNews(response.text || null);
    } catch (err) {
      console.error("News fetch failed", err);
    } finally {
      setLoadingNews(false);
    }
  };

  const fetchSchemes = async () => {
    setLoadingSchemes(true);
    // Simulating /api/schemes fetch
    setTimeout(() => {
      const mockSchemes: SchemeAlert[] = [
        {
          id: '1',
          title: 'New Lemon Subsidy Available',
          description: 'Get up to 40% financial aid for high-density lemon plantation in Vidarbha region.',
          tag: 'NEW',
          deadline: 'Aug 30'
        },
        {
          id: '2',
          title: 'Solar Pump Component-C',
          description: 'Apply for grid-connected solar pump subsidies under PM-KUSUM scheme.',
          tag: 'EXPIRING',
          deadline: 'July 15'
        },
        {
          id: '3',
          title: 'Organic Fertilizer Grant',
          description: 'Direct benefit transfer for verified organic compost units.',
          tag: 'URGENT'
        }
      ];
      setSchemes(mockSchemes);
      setLoadingSchemes(false);
    }, 1500);
  };

  useEffect(() => {
    fetchLiveInsights();
    fetchSchemes();
  }, [currentLang]);

  return (
    <div className="p-6 bg-[#F8FAF8] min-h-full relative pb-32">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-700 flex items-center justify-center text-white shadow-lg shadow-green-100">
            <Landmark size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest leading-none mb-1">{t.namaste}</p>
            <h2 className="text-xl font-black text-gray-900 leading-none">{user?.name || 'Farmer'}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-green-700 flex items-center gap-1 transition-all active:scale-95"
          >
            <Globe size={18} />
            <span className="text-[10px] font-black uppercase">{currentLang}</span>
          </button>
          <button className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-400 active:scale-95 relative">
            <Bell size={22} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </div>

      {showLangMenu && (
        <div className="absolute top-20 right-6 z-50 bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 w-48 animate-in fade-in slide-in-from-top-2 duration-200">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onLangChange(lang.code as Language);
                setShowLangMenu(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-2xl text-sm transition-colors ${currentLang === lang.code
                ? 'bg-green-50 text-green-700 font-black'
                : 'text-gray-600 hover:bg-gray-50 font-bold'
                }`}
            >
              {lang.native}
            </button>
          ))}
        </div>
      )}

      {/* Weather Widget */}
      <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-[2.5rem] p-7 text-white shadow-2xl shadow-green-200/50 mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-green-200 text-xs font-bold uppercase tracking-widest mb-1">{user?.district || 'Nagpur'}</p>
              <h3 className="text-4xl font-black">28°C</h3>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-3xl">
              <CloudSun size={32} className="text-yellow-300" />
            </div>
          </div>
          <p className="text-green-50 font-bold text-sm">Clear Sky • 12% Humidity</p>
          <div className="mt-6 pt-5 border-t border-white/10 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span>Forecast: Rain expected on Friday</span>
            <ChevronRight size={14} className="text-green-400" />
          </div>
        </div>
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-green-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Daily Insights / News */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Newspaper size={16} className="text-indigo-600" /> Daily Brief
          </h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</span>
        </div>

        {loadingNews ? (
          <div className="flex items-center gap-3 py-2">
            <Loader2 size={16} className="animate-spin text-indigo-600" />
            <p className="text-xs font-bold text-gray-400">Curating local updates...</p>
          </div>
        ) : (
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-700 leading-relaxed line-clamp-3">
              {liveNews || "Market prices for Soybeans are up by 4% in Nagpur mandi due to export demand. Cloudy weather expected in Vidarbha region."}
            </p>
            <div className="mt-4 flex gap-2">
              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase rounded-lg border border-indigo-100">Market</span>
              <span className="px-2 py-1 bg-green-50 text-green-700 text-[9px] font-black uppercase rounded-lg border border-green-100">Weather</span>
            </div>
          </div>
        )}
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-60"></div>
      </div>

      {/* LIVE VOICE CONSULT BUTTON */}
      <button
        onClick={() => navigateTo('live-audio')}
        className="w-full bg-white p-2 rounded-[3rem] border border-green-100 shadow-xl shadow-green-100/40 flex items-center mb-8 active:scale-95 transition-all group overflow-hidden relative"
      >
        <div className="flex items-center gap-4 w-full">
          <div className="w-16 h-16 rounded-full bg-green-700 flex items-center justify-center text-white shadow-lg relative z-10">
            <Mic size={28} className="animate-pulse" />
            <div className="absolute inset-0 bg-green-400 blur-xl opacity-30 animate-ping rounded-full"></div>
          </div>
          <div className="text-left flex-1 relative z-10">
            <h4 className="text-base font-black text-gray-900 leading-none mb-1">Live Voice Consult</h4>
            <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">Talk to AI Scientist Now</p>
          </div>
          <div className="pr-6 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
              <Radio size={20} />
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
      </button>

      {/* Main Action Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <GridAction
          title={t.scan_disease}
          subtitle="Vision-QC & Doctor"
          icon={<Camera size={24} className="text-blue-600" />}
          onClick={() => navigateTo('vision')}
          bgColor="bg-blue-50"
        />
        <GridAction
          title="Govt Schemes"
          subtitle="Benefits & Subsidies"
          icon={<Landmark size={24} className="text-amber-600" />}
          onClick={() => navigateTo('scheme-setu')}
          bgColor="bg-amber-50"
        />
        <GridAction
          title={t.ask_tutor}
          subtitle="Text AI Support"
          icon={<MessageCircle size={24} className="text-orange-600" />}
          onClick={() => navigateTo('chat')}
          bgColor="bg-orange-50"
        />
        <GridAction
          title="Price Forecast"
          subtitle="Geo-Prophet AI"
          icon={<TrendingUp size={24} className="text-emerald-600" />}
          onClick={() => navigateTo('forecast')}
          bgColor="bg-emerald-50"
        />
        <GridAction
          title="Crop Health"
          subtitle="Stress Analysis"
          icon={<Activity size={24} className="text-red-600" />}
          onClick={() => navigateTo('crop-stress')}
          bgColor="bg-red-50"
        />
      </div>

      {/* Government Scheme Alerts Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Bell size={16} className="text-green-700" /> {t.scheme_alerts}
          </h3>
          <button className="text-[10px] font-black text-green-700 uppercase tracking-widest">
            {t.view_all}
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-2">
          {loadingSchemes ? (
            <div className="w-full h-32 flex flex-col items-center justify-center bg-white rounded-[2rem] border border-gray-100">
              <Loader2 size={24} className="animate-spin text-green-600 mb-2" />
              <p className="text-[10px] font-black text-gray-400 uppercase">Checking Portals...</p>
            </div>
          ) : (
            schemes.map((scheme) => (
              <div
                key={scheme.id}
                className="min-w-[240px] bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group active:scale-95 transition-all"
              >
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${scheme.tag === 'NEW' ? 'bg-green-100 text-green-700' :
                    scheme.tag === 'EXPIRING' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {scheme.tag === 'NEW' ? t.new_alert : scheme.tag === 'EXPIRING' ? t.expiring : 'URGENT'}
                  </span>
                  {scheme.deadline && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                      <Calendar size={10} /> {scheme.deadline}
                    </div>
                  )}
                </div>
                <h4 className="text-sm font-black text-gray-900 mb-2 group-hover:text-green-700 transition-colors">{scheme.title}</h4>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed line-clamp-2">{scheme.description}</p>
                <div className="mt-4 flex justify-between items-center">
                  <button className="text-[9px] font-black text-green-700 uppercase flex items-center gap-1 group-hover:gap-2 transition-all">
                    Learn More <ChevronRight size={10} />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:text-green-600 group-hover:bg-green-50 transition-all">
                    <ExternalLink size={12} />
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-green-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fin-Trust Banner */}
      <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">{t.fin_trust}</h3>
      <button
        onClick={() => navigateTo('finance')}
        className="w-full bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/30 flex items-center justify-between mb-8 active:scale-[0.98] transition-all group"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-[1.5rem] bg-gray-900 flex flex-col items-center justify-center text-white group-hover:bg-green-700 transition-colors">
            <ShieldCheck size={28} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t.credit_score}</p>
            <div className="flex items-baseline gap-2">
              <h4 className="text-2xl font-black text-gray-900">742</h4>
              <span className="text-[10px] text-green-600 font-black uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded-full">Excellent</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-2 rounded-full">
          <ChevronRight size={20} className="text-gray-300" />
        </div>
      </button>

      {/* Community Teaser (Filling space below Fin-Trust) */}
      <div className="bg-[#1e293b] rounded-[2.5rem] p-7 text-white relative overflow-hidden shadow-xl mb-4">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-black">Kisan Community</h3>
            <Users size={18} className="text-blue-300" />
          </div>
          <p className="text-xs text-gray-400 font-bold mb-5 leading-relaxed">
            Connect with 10,000+ farmers in your district. Share tips and get advice.
          </p>

          <div className="flex items-center gap-4 mb-5">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#1e293b] bg-gray-500 flex items-center justify-center text-[8px]">
                  {i}
                </div>
              ))}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-200">+42 New Discussions</span>
          </div>

          <button className="w-full py-4 bg-white text-[#1e293b] rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-colors">
            Join Conversation
          </button>
        </div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -ml-10 -mb-10"></div>
      </div>
    </div>
  );
};

const GridAction: React.FC<{ title: string; subtitle: string; icon: React.ReactNode; onClick: () => void; bgColor: string }> = ({ title, subtitle, icon, onClick, bgColor }) => (
  <button
    onClick={onClick}
    className={`${bgColor} p-6 rounded-[2.5rem] flex flex-col items-start text-left border border-black/5 shadow-sm active:scale-95 transition-all h-44 group overflow-hidden relative`}
  >
    <div className="p-3 bg-white rounded-2xl mb-4 shadow-md group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <span className="font-black text-gray-900 text-sm leading-tight mb-1 relative z-10">{title}</span>
    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider relative z-10">{subtitle}</span>
    <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
      {icon}
    </div>
  </button>
);

export default DashboardScreen;
