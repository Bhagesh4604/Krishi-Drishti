
import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import {
   ShieldCheck,
   ArrowUpRight,
   Wallet,
   Leaf,
   ChevronRight,
   Landmark,
   CreditCard,
   TrendingUp,
   History,
   Users,
   Satellite,
   Award,
   Zap,
   CloudRain,
   ShieldAlert,
   Activity,
   CheckCircle2,
   FileSearch,
   Timer,
   AlertTriangle,
   UserCheck,
   Ban,
   Lock,
   ShoppingCart
} from 'lucide-react';
import { COLORS } from '../constants';
import { financeService } from '../src/services/api';

interface FinanceScreenProps {
   navigateTo: (screen: Screen) => void;
   t: any;
}

const FinanceScreen: React.FC<FinanceScreenProps> = ({ navigateTo, t }) => {
   const [payoutTriggered, setPayoutTriggered] = useState(false);
   const [rainfall, setRainfall] = useState(0);
   const [trustScore, setTrustScore] = useState(0);

   useEffect(() => {
      const loadStatus = async () => {
         try {
            const data = await financeService.getStatus();
            setRainfall(data.rainfall_mm);
            setTrustScore(data.trust_score);
            setPayoutTriggered(data.payout_eligible);
         } catch (e) {
            console.error(e);
         }
      }
      loadStatus();
      // Optional: Poll every 10s for live feel if desired, or just load once.
   }, []);

   return (
      <div className="p-6 bg-[#F8FAF8] min-h-full pb-32">
         {/* Header */}
         <div className="flex justify-between items-center mb-8">
            <div>
               <h2 className="text-2xl font-black text-gray-900">{t.fin_trust}</h2>
               <div className="flex items-center gap-1 mt-1">
                  <ShieldCheck size={12} className="text-green-600" />
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Bank-Verified Profile</p>
               </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 active:bg-gray-50">
               <History size={24} />
            </div>
         </div>

         {/* Agri-Credit Score with Multi-Layer Defense */}
         <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl shadow-green-900/20 mb-8 relative overflow-hidden transition-all hover:shadow-green-900/30 group">
            <div className="relative z-10 flex flex-col items-center">
               <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                     <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                     <circle cx="50" cy="50" r="45" fill="none" stroke="url(#scoreGradient)" strokeWidth="8" strokeDasharray="283" strokeDashoffset="70" strokeLinecap="round" />
                     <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                           <stop offset="0%" stopColor="#ef4444" />
                           <stop offset="50%" stopColor="#eab308" />
                           <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                     </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Fin-Trust Index</p>
                     <h3 className="text-5xl font-black text-white">{trustScore}</h3>
                     <div className="mt-2 flex items-center gap-1 text-green-400">
                        <TrendingUp size={12} />
                        <span className="text-[10px] font-black">+12</span>
                     </div>
                  </div>
               </div>

               <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-[10px] font-black text-gray-500 uppercase">Integrity Score</span>
                     <span className="text-[10px] font-black text-green-400">EXCELLENT</span>
                  </div>
                  <div className="flex gap-1.5">
                     {[...Array(12)].map((_, i) => (
                        <div key={i} className="flex-1 h-2 bg-green-500 rounded-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
                     ))}
                  </div>
                  <p className="text-[8px] text-gray-500 font-bold mt-2 uppercase">Verified by Macro-Drishti Satellite Forensics</p>
               </div>

               <div className="grid grid-cols-3 gap-3 w-full">
                  <ScoreFactor icon={<Lock size={14} />} label="Input Lock" value="Sync'd" />
                  <ScoreFactor icon={<FileSearch size={14} />} label="Audit" value="Clean" />
                  <ScoreFactor icon={<Users size={14} />} label="Social" value="Active" />
               </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-green-500/20 transition-all"></div>
         </div>

         <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">Layered Defense Logic</h3>
         <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm mb-8 space-y-5">
            <div className="flex gap-4">
               <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ShoppingCart size={20} />
               </div>
               <div>
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Layer 1: Input-Lock</h4>
                  <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-1">
                     Organic claims are auto-blocked if your digital purchase ledger shows chemical fertilizer acquisition in the last 6 months.
                  </p>
               </div>
            </div>
            <div className="flex gap-4">
               <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center shrink-0">
                  <Activity size={20} />
               </div>
               <div>
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Layer 2: Growth Curve Audit</h4>
                  <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-1">
                     Sentinel-2 detects "Artificial Spikes" in crop greenness caused by Urea. Mismatches trigger a permanent "Fraud Badge" on the blockchain.
                  </p>
               </div>
            </div>
            <div className="flex gap-4">
               <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Ban size={20} />
               </div>
               <div>
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Layer 3: Land Blacklisting</h4>
                  <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-1">
                     Failed spot-checks lead to survey-number blacklisting. You cannot create a new account to clear your fraud history.
                  </p>
               </div>
            </div>
         </div>

         <button
            onClick={() => navigateTo('carbon-vault')}
            className="w-full bg-gradient-to-br from-green-600 to-green-800 p-6 rounded-[2.5rem] mb-8 shadow-xl shadow-green-100 text-white flex items-center justify-between group relative overflow-hidden active:scale-[0.98] transition-all"
         >
            <div className="flex items-center gap-4 relative z-10">
               <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Leaf size={30} className="text-green-200" />
               </div>
               <div className="text-left">
                  <p className="text-[10px] font-black text-green-200 uppercase tracking-widest mb-1">Passive Income</p>
                  <h4 className="text-xl font-black">Carbon Vault</h4>
               </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative z-10">
               <ArrowUpRight size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>
            <div className="absolute top-0 right-0 w-32 h-full bg-white/5 -skew-x-12 translate-x-12"></div>
         </button>

         {/* Parametric Shield */}
         <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">{t.parametric_shield}</h3>
         <div className={`rounded-[2.5rem] p-7 shadow-xl transition-all duration-500 border relative overflow-hidden mb-8 ${payoutTriggered ? 'bg-amber-600 border-amber-500 shadow-amber-200' : 'bg-white border-gray-100 shadow-gray-200/40'
            }`}>
            <div className="flex justify-between items-start mb-6">
               <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${payoutTriggered ? 'bg-white text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                     {payoutTriggered ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
                  </div>
                  <div>
                     <h4 className={`text-lg font-black leading-tight ${payoutTriggered ? 'text-white' : 'text-gray-900'}`}>
                        {t.drought_shield}
                     </h4>
                     <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${payoutTriggered ? 'bg-red-300 animate-pulse' : 'bg-green-500'}`}></div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${payoutTriggered ? 'text-white/80' : 'text-gray-400'}`}>
                           {payoutTriggered ? t.payout_triggered : t.smart_contract}
                        </p>
                     </div>
                  </div>
               </div>
            </div>

            <div className={`p-5 rounded-3xl mb-6 flex justify-between items-center ${payoutTriggered ? 'bg-white/10' : 'bg-gray-50'}`}>
               <div>
                  <p className={`text-[9px] font-bold uppercase ${payoutTriggered ? 'text-white/60' : 'text-gray-400'}`}>Live Rainfall</p>
                  <h5 className={`text-2xl font-black ${payoutTriggered ? 'text-white' : 'text-gray-900'}`}>
                     {rainfall.toFixed(1)}<span className="text-sm font-medium ml-1">mm</span>
                  </h5>
               </div>
               <div className="text-right">
                  <p className={`text-[9px] font-bold uppercase ${payoutTriggered ? 'text-white/60' : 'text-gray-400'}`}>Threshold</p>
                  <h5 className={`text-xl font-black ${payoutTriggered ? 'text-white/40' : 'text-gray-300'}`}>
                     &lt; 100.0mm
                  </h5>
               </div>
            </div>

            {payoutTriggered ? (
               <div className="animate-in zoom-in duration-300">
                  <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 mb-4">
                     <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center text-white shadow-lg shadow-green-600/20">
                        <CheckCircle2 size={24} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-white/70 uppercase">Smart Contract Payout</p>
                        <p className="text-xl font-black text-white">₹20,000.00 Sent</p>
                     </div>
                  </div>
               </div>
            ) : (
               <div className="flex gap-3">
                  <div className="flex-1 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
                     <CloudRain size={20} className="text-blue-500" />
                     <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Coverage</p>
                        <p className="text-sm font-black text-gray-900">₹20,000</p>
                     </div>
                  </div>
                  <button className="flex-1 bg-green-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-green-100 active:scale-95 transition-all">
                     {t.buy_shield}
                  </button>
               </div>
            )}
         </div>
      </div>
   );
};

const ScoreFactor: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
   <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-1">
      <div className="text-green-400">{icon}</div>
      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter text-center h-4 flex items-center">{label}</p>
      <p className="text-xs font-black text-white">{value}</p>
   </div>
);

export default FinanceScreen;
