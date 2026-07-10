import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Droplets, CloudSun, Leaf, AlertCircle, Sprout, Wind, Calendar, CheckCircle2, Sparkles } from 'lucide-react';
import { useLanguage } from '../src/context/LanguageContext';
import axios from 'axios';

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
      const response = await axios.post('http://localhost:8000/api/irrigation/recommend', {
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 pt-12 pb-6 px-6 text-white shadow-md relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => navigateTo('home')}
            className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-2xl font-bold">{t('smart_irrigation')}</h1>
        </div>
        <p className="text-blue-50 opacity-90 text-sm">
          {t('digital_twin')} - Optimize water usage with precision algorithms
        </p>
      </div>

      <div className="flex-1 p-6 overflow-y-auto pb-24">
        {/* Form Inputs */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
            <select 
              value={crop} 
              onChange={e => setCrop(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              {['Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Tomato', 'Maize', 'Soybean', 'Groundnut', 'Onion', 'Potato'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Soil Type</label>
              <select 
                value={soil} 
                onChange={e => setSoil(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {['Black Soil', 'Red Soil', 'Sandy Soil', 'Clay Soil', 'Loamy Soil'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area (Acres)</label>
              <input 
                type="number" 
                value={area} 
                onChange={e => setArea(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                min="0.1" step="0.1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forecast</label>
            <select 
              value={weather} 
              onChange={e => setWeather(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {['Normal', 'Sunny', 'Hot', 'Cloudy', 'Rainy'].map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={fetchSchedule}
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading || isTranslating ? (
              <span className="animate-pulse">{t('loading')}</span>
            ) : (
              <>
                <Droplets className="w-5 h-5" />
                Generate Schedule
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3 border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
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
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                    <Droplets className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-500 font-medium mb-1">{t('water_per_acre')}</p>
                  <p className="text-sm font-bold text-gray-900">{recommendation.water_requirement_per_acre}</p>
                </div>
                
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-2">
                    <Leaf className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-500 font-medium mb-1">{t('efficiency')}</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-black text-green-600">{recommendation.efficiency_score}</p>
                    <span className="text-xs font-bold text-green-600">/100</span>
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-indigo-700 font-bold">
                  <Sparkles className="w-5 h-5" />
                  <h3>{t('tips')}</h3>
                </div>
                <p className="text-sm text-indigo-900 mb-4 font-medium opacity-90">{recommendation.method_summary}</p>
                <ul className="space-y-3">
                  {recommendation.ai_tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 7-Day Schedule */}
              <div>
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  {t('irrigation_schedule')}
                </h3>
                <div className="space-y-3">
                  {recommendation.weekly_schedule.map((day) => (
                    <div 
                      key={day.day} 
                      className={`p-4 rounded-2xl border ${
                        day.should_irrigate 
                          ? 'bg-white border-blue-100 shadow-sm' 
                          : 'bg-gray-50 border-gray-200 border-dashed'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                            day.should_irrigate ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {day.day_name}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900">{t(day.should_irrigate ? (day.method === 'Sprinkler' ? 'sprinkler' : 'drip') : 'rest')}</p>
                            {day.should_irrigate && (
                              <p className="text-xs font-medium text-blue-600">{day.duration_minutes} mins • {day.water_amount_liters}L</p>
                            )}
                          </div>
                        </div>
                        {day.should_irrigate ? (
                          <Droplets className="w-6 h-6 text-blue-400" />
                        ) : (
                          <Wind className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2 pl-[3.25rem]">{day.note}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center justify-center gap-2 text-green-700 font-bold shadow-sm">
                <CloudSun className="w-5 h-5" />
                {recommendation.savings_estimate}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SmartIrrigationScreen;
