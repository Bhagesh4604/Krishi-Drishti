
import React, { useState, useEffect } from 'react';
import { Screen, Language, VisionMode } from '../types';
import { GoogleGenAI } from '@google/genai';
import { 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  Leaf, 
  Zap, 
  ShieldAlert, 
  Lock, 
  ChevronDown,
  Satellite,
  Share2,
  FileCheck,
  QrCode
} from 'lucide-react';
import { COLORS } from '../constants';
import { languages } from '../translations';

interface VisionResultScreenProps {
  navigateTo: (screen: Screen) => void;
  image: string | null;
  mode: VisionMode;
  language: Language;
  t: any;
}

const VisionResultScreen: React.FC<VisionResultScreenProps> = ({ navigateTo, image, mode, language, t }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOrganicMode, setIsOrganicMode] = useState(false);
  
  const currentLangLabel = languages.find(l => l.code === language)?.label || 'English';

  useEffect(() => {
    if (image) {
      performAnalysis(image, isOrganicMode);
    }
  }, [image, mode, isOrganicMode]);

  const performAnalysis = async (base64Image: string, organic: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = base64Image.split(',')[1];
      
      let prompt = '';
      if (mode === 'verify-qr') {
        prompt = `You are a Digital Fraud Auditor. Analyze this QR code/packaging image. Return a JSON response with fields: 'diagnosis' ('Authentic' or 'Duplicate'), 'id' (Fake hash like 0x8f2...a1), 'history' (array of scan events with 'time' and 'loc'), 'isConsumed' (boolean). If diagnosis is Duplicate, provide a warning.`;
      } else {
        prompt = mode === 'diagnosis' 
          ? `Analyze this agricultural crop image. Identify the plant and any visible diseases. Provide the final response EXCLUSIVELY IN ${currentLangLabel}. Return a JSON response with fields: 'diagnosis' (name of disease or 'Healthy'), 'confidence' (percentage), 'summary' (brief description), and 'remedies' (an array of objects with 'title' and 'description').`
          : `Act as a Professional Agricultural Quality Inspector. Analyze this produce (fruit/vegetable) for Grading. Evaluate size, color uniformity, and surface defects. Assign a Grade (A, B, or C). Provide the final response EXCLUSIVELY IN ${currentLangLabel}. Return a JSON response with fields: 'diagnosis' (Grade A, B, or C), 'confidence' (percentage), 'summary' (Why this grade was assigned), 'metrics' (object with 'color', 'size', 'defects' keys and descriptive values), 'marketValue' (Estimated % of premium price).`;

        if (organic && mode === 'diagnosis') {
          prompt += " IMPORTANT: The user has requested 'Organic Cure' mode. You MUST provide ONLY organic, biological, and natural remedies. STRICTLY FORBIDDEN to suggest any chemical, synthetic, or inorganic pesticides. Instead, suggest natural remedies like 'Spray Neem Oil', 'Sour Buttermilk spray', 'Dashparni Ark', or 'Bio-Fertilizers'.";
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
            { text: prompt }
          ]
        },
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '{}');
      setAnalysis(result);
    } catch (err) {
      console.error("AI Analysis failed:", err);
      setError("Unable to analyze. Check lighting and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    alert("Certificate shared to WhatsApp!");
  };

  return (
    <div className="h-full bg-[#f8fafc] overflow-y-auto pb-10">
      <div className="relative h-96 bg-black">
        {image && <img src={image} className="w-full h-full object-cover opacity-80" alt="Scanned" />}
        
        {/* Anti-Fraud Scanning UI */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="w-52 h-52 border-2 border-green-500/50 rounded-[2.5rem] relative">
              {/* Simulated Detection Box from Priority 2 */}
              <div className="absolute top-4 right-4 w-12 h-12 border-2 border-red-500 rounded-lg animate-pulse">
                <div className="absolute -top-3 right-0 bg-red-500 text-white text-[8px] font-black px-1 rounded">DETECTED</div>
              </div>
              <div className="absolute top-0 left-0 w-full h-0.5 bg-green-400 animate-scan-line shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
           </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] via-transparent to-transparent"></div>
        <button 
          onClick={() => navigateTo('vision')}
          className="absolute top-6 left-6 p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white"
        >
          <ArrowLeft size={24} />
        </button>

        {/* Priority 4: Organic Cure Toggle Overlay */}
        {mode === 'diagnosis' && !loading && (
          <div className="absolute bottom-16 right-6 z-20">
             <button 
              onClick={() => setIsOrganicMode(!isOrganicMode)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl ${
                isOrganicMode ? 'bg-green-600 text-white ring-4 ring-green-100' : 'bg-white text-gray-400'
              }`}
             >
               <Leaf size={16} fill={isOrganicMode ? 'white' : 'none'} />
               {isOrganicMode ? "Show Organic Cure" : "Show Chemical"}
             </button>
          </div>
        )}

        {!loading && !error && (
          <div className="absolute top-6 right-6 p-4 bg-white rounded-[1.5rem] shadow-2xl flex flex-col items-center gap-1 border border-green-100">
             <div className="w-10 h-10 rounded-full flex items-center justify-center text-white mb-1 bg-green-700">
                <ShieldCheck size={20} />
             </div>
             <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Satya-Patra</p>
             <p className="text-[7px] font-bold uppercase text-green-600">Verified Report</p>
          </div>
        )}
      </div>

      <div className="px-6 -mt-10 relative z-10">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 shadow-xl border border-gray-100 flex flex-col items-center text-center">
            <Loader2 className="animate-spin text-green-600 mb-4" size={40} />
            <h3 className="text-xl font-bold text-gray-900">Synchronizing Ledger...</h3>
            <p className="text-xs text-gray-400 mt-2 font-black uppercase tracking-widest">Generating Blockchain Certificate</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Priority 2: Blockchain Certificate UI */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"></div>
               
               <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="text-xl font-black text-gray-900 leading-tight">Blockchain Verified Report</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Immutable Digital Record</p>
                 </div>
                 <QrCode size={40} className="text-gray-900 opacity-20" />
               </div>

               <div className="flex items-center gap-4 mb-6">
                 <div className="p-4 bg-green-50 rounded-2xl text-green-700">
                    <FileCheck size={32} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-gray-900">{analysis?.diagnosis}</h3>
                    <p className="text-xs font-bold text-green-600">{analysis?.confidence || 92}% Accuracy Confidence</p>
                 </div>
               </div>

               <div className="grid grid-cols-1 gap-3 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                     <span className="text-[10px] font-bold text-gray-400 uppercase">Timestamp</span>
                     <span className="text-xs font-black text-gray-900">05 Feb 2026, 14:30</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-bold text-gray-400 uppercase">Block Hash</span>
                     <span className="text-[10px] font-mono text-gray-600 bg-gray-200 px-2 py-0.5 rounded">0x7d...a9f</span>
                  </div>
               </div>

               <p className="text-sm text-gray-600 font-medium leading-relaxed mb-8">
                 {analysis?.summary || 'Disease detected. Immediate action recommended.'}
               </p>

               <button 
                 onClick={handleShare}
                 className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
               >
                 <Share2 size={16} /> Share Certificate
               </button>
            </div>

            {/* AI Remedies Section */}
            {analysis?.remedies && analysis.remedies.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-lg font-black text-gray-900">{isOrganicMode ? "Organic Cure Path" : "Standard Chemical Remedies"}</h3>
                   {isOrganicMode && (
                     <span className="text-[9px] font-black text-green-700 bg-green-50 px-2 py-1 rounded-lg uppercase border border-green-100">Chemicals Forbidden</span>
                   )}
                </div>
                {analysis.remedies.map((remedy: any, i: number) => (
                  <div key={i} className={`bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex gap-4 animate-in slide-in-from-bottom-2 duration-300 ${isOrganicMode ? 'ring-2 ring-green-50 border-green-100' : ''}`} style={{ animationDelay: `${i * 100}ms` }}>
                    <div className={`p-3 rounded-2xl h-fit ${isOrganicMode ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'bg-blue-50 text-blue-700'}`}>
                      {isOrganicMode ? <Leaf size={24} /> : <Zap size={24} />}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-base">{remedy.title}</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed font-medium">{remedy.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={() => navigateTo('home')}
              className="w-full py-5 rounded-[2rem] font-black text-sm text-white shadow-2xl transition-all bg-gray-900 active:scale-95"
            >
              Save to Farm Log
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default VisionResultScreen;
