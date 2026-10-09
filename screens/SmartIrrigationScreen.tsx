import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Droplets, CloudSun, Leaf, AlertCircle, Sprout, Wind, Calendar, CheckCircle2, Sparkles } from 'lucide-react';
import { useLanguage } from '../src/context/LanguageContext';
import axios from 'axios';
import api from '../src/services/api';
interface SmartIrrigationScreenProps {
  navigateTo: (screen: string) => void;
}

interface IrrigationSchedule {
  day: int;
  day_name: string;
  should_irrigate: boolean;
  duration_minutes: number;
  water_amount_liters: number;
  method: string;
  note: string;
}

interface IrrigationRecommendation {
  crop_type: string;
  soil_type: string;
  area_acres: number;
  water_requirement_per_acre: string;
  weekly_schedule: IrrigationSchedule[];
  total_weekly_water_liters: number;
  savings_estimate: string;
  efficiency_score: number;
  ai_tips: string[];
  method_summary: string;
}

const SmartIrrigationScreen: React.FC<SmartIrrigationScreenProps> = ({ navigateTo }) => {
  const { t, isTranslating, translate } = useLanguage();
  
  const [crop, setCrop] = useState('Rice');
  const [soil, setSoil] = useState('Black Soil');
  const [area, setArea] = useState('1');
  const [weather, setWeather] = useState('Normal');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendation, setRecommendation] = useState<IrrigationRecommendation | null>(null);

  const fetchSchedule = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/irrigation/recommend', {
        crop_type: crop,
        soil_type: soil,
        area_acres: parseFloat(area) || 1,
        weather_forecast: weather
      });
      
      const data = response.data;
      
      // Dynamic translations for AI tips and summaries
      const translatedTips = await Promise.all(
        data.ai_tips.map((tip: string) => translate(tip))
      );
      const translatedSummary = await translate(data.method_summary);
      const translatedSavings = await translate(data.savings_estimate);
      
      setRecommendation({
        ...data,
        ai_tips: translatedTips,
        method_summary: translatedSummary,
        savings_estimate: translatedSavings
      });
      
    } catch (err) {
      console.error(err);
      setError('Failed to fetch schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col font-sans relative overflow-hidden bg-black">
      
      {/* ── Animated Digital Twin Background ── */}
      <div className="absolute top-0 left-0 w-full h-96 z-0 overflow-hidden" style={{ background: '#02040a' }}>
        {/* 3D Perspective Grid */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'linear-gradient(rgba(14, 165, 233, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.4) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            backgroundPosition: 'center',
            transform: 'perspective(300px) rotateX(60deg) scale(2) translateY(-20px)',
            transformOrigin: 'top center'
          }}
        />
        
        {/* Glowing Radar Sweep */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full border border-sky-900/50 flex items-center justify-center opacity-40">
          <div className="w-[400px] h-[400px] rounded-full border border-sky-800/40 flex items-center justify-center">
            <div className="w-[200px] h-[200px] rounded-full border border-sky-600/30" />
          </div>
          <motion.div 
            animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full"
            style={{ background: 'conic-gradient(from 0deg, transparent 75%, rgba(14,165,233,0.4) 100%)' }}
          />
        </div>
        
        {/* Gradient Mask */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#02040a]/80 to-black" />
      </div>

      {/* ── Header ── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-5 pt-10 pb-5 flex items-center gap-4 relative z-10"
      >
        <button onClick={() => navigateTo('home')} className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors text-white shadow-lg shadow-black/20 border border-white/10 active:scale-95">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span></span>
            <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest drop-shadow-md">
              Digital Twin AI
            </p>
          </div>
          <h1 className="text-white text-2xl font-black tracking-tight drop-shadow-lg">{t('smart_irrigation')}</h1>
        </div>
      </motion.div>

      <div className="flex-1 px-5 overflow-y-auto pb-24 relative z-10">
        
        {/* ── 3D Floating Form Card ── */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
          className="p-5 rounded-[2rem] mb-6 space-y-5 relative overflow-hidden backdrop-blur-xl" 
          style={{ background: 'linear-gradient(145deg, rgba(20,30,40,0.65), rgba(10,15,20,0.85))', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)' }}
        >
          {/* Ambient Inner Glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-sky-500/20 blur-3xl rounded-full" />
          
          <div className="relative z-10 flex items-center justify-between mb-2">
            <p className="text-xs text-gray-300 font-medium leading-relaxed max-w-[70%]">
              Configure parameters to generate a hyper-local watering schedule.
            </p>
            {/* 3D Animated Droplet Icon */}
            <motion.div 
              animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-full flex items-center justify-center border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
              style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(2,132,199,0.4))' }}
            >
              <Droplets className="w-5 h-5 text-sky-300" />
            </motion.div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Crop Type</label>
            <div className="relative">
              <select 
                value={crop} onChange={e => setCrop(e.target.value)}
                className="w-full bg-black/50 border border-white/5 text-white rounded-2xl px-4 py-4 focus:ring-2 focus:ring-sky-500/50 outline-none transition-all font-bold appearance-none shadow-inner"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                {['Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Tomato', 'Maize', 'Soybean', 'Groundnut', 'Onion', 'Potato'].map(c => (
                  <option key={c} value={c} className="bg-gray-900">{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Soil Type</label>
              <select 
                value={soil} onChange={e => setSoil(e.target.value)}
                className="w-full bg-black/50 border border-white/5 text-white rounded-2xl px-4 py-4 focus:ring-2 focus:ring-sky-500/50 outline-none transition-all font-bold appearance-none shadow-inner"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                {['Black Soil', 'Red Soil', 'Sandy Soil', 'Clay Soil', 'Loamy Soil'].map(s => (
                  <option key={s} value={s} className="bg-gray-900">{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Area (Acres)</label>
              <input 
                type="number" value={area} onChange={e => setArea(e.target.value)}
                className="w-full bg-black/50 border border-white/5 text-white rounded-2xl px-4 py-4 focus:ring-2 focus:ring-sky-500/50 outline-none transition-all font-bold shadow-inner"
                min="0.1" step="0.1"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Weather Forecast</label>
            <select 
              value={weather} onChange={e => setWeather(e.target.value)}
              className="w-full bg-black/50 border border-white/5 text-white rounded-2xl px-4 py-4 focus:ring-2 focus:ring-sky-500/50 outline-none transition-all font-bold appearance-none shadow-inner"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem top 50%', backgroundSize: '0.65rem auto' }}
            >
              {['Normal', 'Sunny', 'Hot', 'Cloudy', 'Rainy'].map(w => (
                <option key={w} value={w} className="bg-gray-900">{w}</option>
              ))}
            </select>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
            onClick={fetchSchedule}
            disabled={loading}
            className="w-full mt-4 relative overflow-hidden rounded-2xl font-black text-sm py-5 transition-all flex items-center justify-center gap-2 group shine"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 15px 30px -10px rgba(2,132,199,0.7), inset 0 1px 2px rgba(255,255,255,0.4)' }}
          >
            {loading || isTranslating ? (
              <span className="animate-pulse text-white flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('loading')}
              </span>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-sky-100" />
                <span className="text-white tracking-wide">GENERATE AI SCHEDULE</span>
              </>
            )}
          </motion.button>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 rounded-xl flex items-start gap-3 border" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {recommendation && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl flex flex-col items-center text-center relative overflow-hidden group" style={{ background: 'linear-gradient(145deg, #0f172a, #020617)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-colors" />
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 relative z-10" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 8px 16px rgba(2,132,199,0.4), inset 0 1px 1px rgba(255,255,255,0.3)' }}>
                    <Droplets className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 relative z-10">{t('water_per_acre')}</p>
                  <p className="text-lg font-black text-white relative z-10">{recommendation.water_requirement_per_acre}</p>
                </div>
                
                <div className="p-4 rounded-3xl flex flex-col items-center text-center relative overflow-hidden group" style={{ background: 'linear-gradient(145deg, #064e3b, #022c22)', border: '1px solid rgba(52,211,153,0.1)', boxShadow: '0 10px 30px -10px rgba(5,150,105,0.3)' }}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 relative z-10" style={{ background: 'linear-gradient(135deg, #34d399, #059669)', boxShadow: '0 8px 16px rgba(5,150,105,0.4), inset 0 1px 1px rgba(255,255,255,0.3)' }}>
                    <Leaf className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-[10px] text-emerald-200/60 font-bold uppercase tracking-widest mb-1 relative z-10">{t('efficiency')}</p>
                  <div className="flex items-baseline gap-1 relative z-10">
                    <p className="text-3xl font-black text-emerald-400">{recommendation.efficiency_score}</p>
                    <span className="text-[10px] font-bold text-emerald-500">/100</span>
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              <div className="p-5 rounded-3xl border relative overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(76,29,149,0.2), rgba(15,23,42,0.8))', border: '1px solid rgba(139,92,246,0.15)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="text-purple-300 font-bold text-sm tracking-wide">{t('tips')}</h3>
                </div>
                <p className="text-[13px] text-purple-200/80 mb-5 font-medium leading-relaxed">{recommendation.method_summary}</p>
                <ul className="space-y-3 relative z-10">
                  {recommendation.ai_tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-3 bg-black/20 p-3 rounded-2xl border border-white/5">
                      <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                      <span className="text-[13px] text-gray-300 leading-relaxed font-medium">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 7-Day Schedule */}
              <div className="pt-2">
                <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2 px-1 text-sm tracking-wide">
                  <Calendar className="w-5 h-5 text-sky-400" />
                  {t('irrigation_schedule')}
                </h3>
                <div className="space-y-3">
                  {recommendation.weekly_schedule.map((day) => (
                    <div 
                      key={day.day} 
                      className={`p-4 rounded-3xl border transition-all ${
                        day.should_irrigate 
                          ? 'bg-[#0a1520] border-sky-500/20 shadow-[0_4px_20px_rgba(2,132,199,0.15)]' 
                          : 'bg-white/5 border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${
                            day.should_irrigate ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-white/5 text-gray-500'
                          }`}>
                            {day.day_name.substring(0,3)}
                          </span>
                          <div>
                            <p className="font-black text-gray-200">{t(day.should_irrigate ? (day.method === 'Sprinkler' ? 'sprinkler' : 'drip') : 'rest')}</p>
                            {day.should_irrigate && (
                              <p className="text-[11px] font-bold text-sky-400 mt-0.5">{day.duration_minutes} mins • {day.water_amount_liters}L</p>
                            )}
                          </div>
                        </div>
                        {day.should_irrigate ? (
                          <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center">
                            <Droplets className="w-5 h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                          </div>
                        ) : (
                          <Wind className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-3 pl-[3.75rem] leading-relaxed">{day.note}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 p-5 rounded-2xl border flex items-center justify-center gap-3 font-bold shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(4,120,87,0.1))', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                <CloudSun className="w-6 h-6" />
                <span className="text-sm">{recommendation.savings_estimate}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SmartIrrigationScreen;
