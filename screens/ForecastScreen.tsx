
import React from 'react';
import { Screen } from '../types';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Info, ChevronRight, BarChart3, Target } from 'lucide-react';
import { COLORS } from '../constants';

interface ForecastScreenProps {
  navigateTo: (screen: Screen) => void;
  t: any;
}

const ForecastScreen: React.FC<ForecastScreenProps> = ({ navigateTo, t }) => {
  return (
    <div className="p-6 bg-[#F8FAF8] min-h-full pb-32">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigateTo('home')} className="text-gray-400 p-1">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-none">Geo-Prophet</h2>
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">Price Forecasting AI</p>
        </div>
      </div>

      {/* Main Forecast Insight */}
      <div className="bg-white rounded-[2.5rem] p-7 shadow-xl shadow-gray-200/40 border border-gray-100 mb-8 overflow-hidden relative">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-black text-gray-900">7-Day Wheat Price Trend</h3>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full">
               <TrendingUp size={12} className="text-green-600" />
               <span className="text-[10px] font-black text-green-700">Rise Expected</span>
            </div>
         </div>

         <div className="flex items-end gap-3 h-40 mb-6">
            {[35, 45, 42, 55, 65, 75, 85].map((h, i) => (
               <div key={i} className="flex-1 flex flex-col items-center group">
                  <div className="w-full bg-gray-50 rounded-t-xl group-hover:bg-amber-100 transition-all relative overflow-hidden" style={{ height: `${h}%` }}>
                     <div className={`absolute inset-0 bg-amber-500 opacity-20 ${i === 6 ? 'opacity-60' : ''}`}></div>
                  </div>
                  <span className="text-[8px] font-black text-gray-400 mt-2">D{i+1}</span>
               </div>
            ))}
         </div>

         <div className="flex justify-between items-center pt-6 border-t border-gray-50">
            <div>
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Predicted Price</p>
               <h4 className="text-2xl font-black text-gray-900">₹2,450 <span className="text-xs text-green-500">/qtl</span></h4>
            </div>
            <button className="bg-green-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100">
               Sell Next Week
            </button>
         </div>
      </div>

      {/* Yield Estimator */}
      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">Satellite Yield Predictor</h3>
      <div className="bg-gray-900 rounded-[2.5rem] p-6 text-white shadow-2xl shadow-green-900/10 mb-8 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-green-400">
               <Target size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Est. Harvest Yield</p>
               <h4 className="text-xl font-black">2.4 Tons <span className="text-[10px] text-green-400">+15% YoY</span></h4>
            </div>
         </div>
         <ChevronRight size={20} className="text-white/20" />
      </div>

      <div className="space-y-4">
         <div className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
               <BarChart3 size={24} />
            </div>
            <div className="flex-1">
               <h4 className="text-sm font-black text-gray-900">Local Supply Gap</h4>
               <p className="text-[10px] text-gray-400 font-bold">Inflow to Nagpur Mandi is down 10% this week.</p>
            </div>
         </div>
         <div className="bg-blue-600 p-5 rounded-3xl text-white flex items-center gap-4 shadow-lg shadow-blue-100">
            <Info size={24} />
            <p className="text-xs font-black leading-tight flex-1">
               Geo-Prophet recommends holding Lemons. Predicted shortage in the northern belt will spike prices in 10 days.
            </p>
         </div>
      </div>
    </div>
  );
};

export default ForecastScreen;
