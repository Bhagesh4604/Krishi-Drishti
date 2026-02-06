
import React, { useState } from 'react';
import { Screen } from '../types';
import { ArrowLeft, Leaf, TrendingUp, ShieldCheck, Satellite, ChevronRight, CheckCircle2 } from 'lucide-react';
import { COLORS } from '../constants';

interface CarbonVaultScreenProps {
  navigateTo: (screen: Screen) => void;
  t: any;
}

const CarbonVaultScreen: React.FC<CarbonVaultScreenProps> = ({ navigateTo, t }) => {
  const [requestSent, setRequestSent] = useState(false);

  const handleRedeem = () => {
    setRequestSent(true);
    setTimeout(() => setRequestSent(false), 4000);
  };

  return (
    <div className="p-6 bg-[#F1F8E9] min-h-full pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigateTo('finance')} className="text-gray-400 p-2 bg-white rounded-2xl shadow-sm">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-none">Green Earnings</h2>
          <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mt-1">Passive Earth Income</p>
        </div>
      </div>

      {/* Priority 1: Main Wallet Card */}
      <div className="bg-white rounded-[3rem] p-8 shadow-2xl shadow-green-900/10 border border-green-100 mb-8 relative overflow-hidden">
        <div className="flex justify-between items-start mb-10">
          <div className="w-16 h-16 rounded-[1.5rem] bg-green-700 flex items-center justify-center text-white shadow-xl">
             <Leaf size={32} />
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Carbon Tokens</p>
             <h3 className="text-5xl font-black text-green-700 tracking-tight">12.5 <span className="text-xl">ACT</span></h3>
          </div>
        </div>

        <div className="flex flex-col gap-4">
           <div className="p-6 bg-green-50 rounded-[2rem] border border-green-100 flex justify-between items-center">
             <div>
                <p className="text-[9px] font-black text-green-600 uppercase tracking-[0.2em] mb-1">Cash Value</p>
                <h4 className="text-3xl font-black text-gray-900">₹ 24,000</h4>
             </div>
             <div className="h-10 w-10 bg-green-200 rounded-full flex items-center justify-center text-green-800">
                <TrendingUp size={20} />
             </div>
           </div>
           
           <button 
             onClick={handleRedeem}
             disabled={requestSent}
             className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${
               requestSent ? 'bg-green-800 text-white' : 'bg-green-700 text-white shadow-green-200 active:scale-95'
             }`}
           >
             {requestSent ? (
               <>
                 <CheckCircle2 size={16} /> Request Sent
               </>
             ) : (
               "Redeem Earnings"
             )}
           </button>
        </div>
      </div>

      {/* Proof of Origin Card */}
      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">Earning Source</h3>
      <div className="bg-gray-900 rounded-[2.5rem] p-6 text-white shadow-2xl mb-8 relative group">
         <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-green-400">
               <Satellite size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verified by Sentinel-2</p>
               <h4 className="text-lg font-black">Teak Plantation</h4>
            </div>
         </div>
         <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center mb-2">
               <span className="text-[10px] font-bold text-gray-500 uppercase">Sequestration Rate</span>
               <span className="text-xs font-black text-green-400">0.82t CO2 / Year</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-green-500 w-3/4"></div>
            </div>
         </div>
         <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
      </div>

      {/* History / News */}
      <div className="space-y-4">
         <div className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrendingUp size={24} />
               </div>
               <div>
                  <h4 className="text-sm font-black text-gray-900">Market Price Up</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Carbon Token: +4.2% Today</p>
               </div>
            </div>
            <ChevronRight size={20} className="text-gray-300 group-hover:text-green-600" />
         </div>

         <div className="p-6 bg-blue-600 rounded-[2.5rem] text-white flex items-center gap-4 shadow-xl shadow-blue-100">
            <div className="p-3 bg-white/20 rounded-2xl">
               <ShieldCheck size={24} />
            </div>
            <p className="text-xs font-black leading-tight flex-1">
               You earned 0.4 Tokens this month for implementing Zero-Till farming on Plot B.
            </p>
         </div>
      </div>
    </div>
  );
};

export default CarbonVaultScreen;
