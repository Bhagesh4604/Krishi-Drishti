
import React, { useState, useEffect } from 'react';
import { Screen, UserProfile, Scheme } from '../types';
import {
  ArrowLeft,
  Sparkles,
  ChevronRight,
  Landmark,
  CheckCircle2,
  FileText,
  Zap,
  Info,
  X,
  Target,
  BrainCircuit,
  Loader2,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { schemesService } from '../src/services/api';

interface SchemeSetuScreenProps {
  navigateTo: (screen: Screen) => void;
  user: UserProfile | null;
  t: any;
}

const MOCK_SCHEMES: Scheme[] = [
  {
    id: '1',
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    department: 'Ministry of Agriculture & Farmers Welfare',
    matchScore: 98,
    benefits: 'Comprehensive insurance cover against crop failure.',
    requirements: ['Valid Land Records', 'Crop Sowing Proof', 'Identity Proof'],
    description: 'Provides insurance coverage and financial support to the farmers in the event of failure of any of the notified crop as a result of natural calamities, pests & diseases.',
    link: 'https://pmfby.gov.in/'
  },
  {
    id: '2',
    name: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)',
    department: 'Dept. of Agriculture, Cooperation & Farmers Welfare',
    matchScore: 92,
    benefits: 'Subsidy up to 45% for Drip & Sprinkler irrigation.',
    requirements: ['Soil Test Report', 'Water Source Proof', 'Aadhar Card'],
    description: 'Aims to expand cultivable area under assured irrigation, improve on-farm water use efficiency to reduce wastage of water.',
    link: 'https://pmksy.gov.in/'
  },
  {
    id: '3',
    name: 'Paramparagat Krishi Vikas Yojana (PKVY)',
    department: 'Organic Farming Division',
    matchScore: 85,
    benefits: 'Financial assistance of ₹50,000 per hectare for 3 years.',
    requirements: ['Farmer Group/Cluster', 'Organic Certification Log', 'Participatory Guarantee System'],
    description: 'Promotes organic farming through a cluster-based approach and PGS certification.',
    link: 'https://pgsindia-ncof.gov.in/pkvy/index.aspx'
  }
];

const SchemeSetuScreen: React.FC<SchemeSetuScreenProps> = ({ navigateTo, user, t }) => {
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [schemes, setSchemes] = useState<Scheme[]>([]); // Use state for schemes
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSchemes = async () => {
      try {
        const data = await schemesService.getSchemes();
        // Map backend response to UI model
        const mapped = data.map((s: any) => ({
          id: s.id.toString(),
          name: s.title,
          department: 'Govt of India', // Placeholder or add to DB
          matchScore: 95, // Placeholder logic
          benefits: s.benefits || s.description,
          requirements: s.eligibility ? [s.eligibility] : ['Citizenship'],
          description: s.description,
          link: s.link || '#'
        }));
        setSchemes(mapped);
      } catch (e) {
        console.error("Failed to load schemes", e);
      }
    };
    loadSchemes();
  }, []);

  const fetchExplanation = async (scheme: Scheme) => {
    setExplainingId(scheme.id);
    setExplanation(null);
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const cropsStr = Array.isArray(user?.crops) ? user?.crops.join(', ') : user?.crops || '';
      const prompt = `Act as a Government Benefit Expert. Analyze why this farmer is a match for the scheme "${scheme.name}". 
      Farmer Profile: ${user?.land_size} acres, Location: ${user?.district}, Category: ${user?.category}, Farming Type: ${user?.farming_type}, Crops: ${cropsStr}.
      Scheme Benefits: ${scheme.benefits}.
      Provide a concise, empathetic explanation in 3 bullet points. Final response must be in ${t.welcome === 'Kisan-Sarathi' ? 'English' : 'Hindi'}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setExplanation(response.text || "You match based on your land size and crop choice.");
    } catch (err) {
      console.error(err);
      setExplanation("Unable to generate AI breakdown right now.");
    } finally {
      setLoading(false);
    }
  };

  const [isApplying, setIsApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'idle' | 'success'>('idle');

  const handleAutoFill = async () => {
    if (!selectedScheme) return;
    setIsApplying(true);
    try {
      await schemesService.applyScheme(selectedScheme.id, selectedScheme.name);
      setApplicationStatus('success');
    } catch (error) {
      console.error("Failed to apply:", error);
      // Optional: set error state
    } finally {
      setIsApplying(false);
      // Reset after 3 seconds
      setTimeout(() => {
        setApplicationStatus('idle');
      }, 3000);
    }
  };

  return (
    <div className="h-full bg-[#F8FAF8] flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="bg-white p-6 pb-8 shadow-sm border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigateTo('home')} className="p-2 -ml-2 text-gray-400">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-gray-900 leading-none">{t.scheme_setu}</h2>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">{t.matcher_tag}</p>
          </div>
        </div>

        {/* Profile Match Gauge */}
        <div className="bg-indigo-900 rounded-[2.5rem] p-6 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
          <div className="flex justify-between items-center relative z-10">
            <div className="flex flex-col items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-[1.5rem] border border-white/20">
              <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest mb-1">{t.match_index}</p>
              <h4 className="text-3xl font-black">94%</h4>
            </div>
            <div className="text-right flex-1 ml-6">
              <h5 className="text-xs font-black uppercase tracking-wider mb-2">Live Recommendation Profile</h5>
              <div className="flex flex-wrap gap-1 justify-end">
                <span className="text-[8px] font-bold px-2 py-1 bg-white/10 rounded-lg">{user?.category}</span>
                <span className="text-[8px] font-bold px-2 py-1 bg-white/10 rounded-lg">{user?.land_size} Acres</span>
                <span className="text-[8px] font-bold px-2 py-1 bg-white/10 rounded-lg">{user?.farming_type}</span>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24 no-scrollbar">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] px-2">{t.eligible_schemes}</h3>

        {schemes.map((scheme, i) => (
          <div
            key={scheme.id}
            className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-xl shadow-gray-200/40 relative overflow-hidden group animate-in slide-in-from-bottom duration-500"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Landmark size={18} />
                </div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider truncate max-w-[150px]">{scheme.department}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                <Cpu size={12} className="text-green-600" />
                <span className="text-[10px] font-black text-green-700">{scheme.matchScore}% Match</span>
              </div>
            </div>

            <h4 className="text-lg font-black text-gray-900 mb-2 leading-tight">{scheme.name}</h4>
            <p className="text-[11px] font-bold text-indigo-700 mb-4">{scheme.benefits}</p>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedScheme(scheme)}
                  className="flex-1 py-4 bg-gray-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  Details <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => fetchExplanation(scheme)}
                  className="w-14 py-4 bg-indigo-50 text-indigo-700 rounded-[1.5rem] flex items-center justify-center border border-indigo-100 active:scale-90 transition-all"
                >
                  <BrainCircuit size={20} />
                </button>
              </div>

              {explainingId === scheme.id && (
                <div className="bg-indigo-900 rounded-3xl p-5 text-white animate-in zoom-in duration-300 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Sparkles size={14} className="text-amber-400" /> AI Eligibility Breakdown
                    </h5>
                    <button onClick={() => setExplainingId(null)} className="text-white/40"><X size={14} /></button>
                  </div>
                  {loading ? (
                    <div className="flex items-center gap-3 py-4">
                      <Loader2 size={18} className="animate-spin text-indigo-400" />
                      <span className="text-[10px] font-black text-indigo-200 uppercase">Analyzing Policy Vectors...</span>
                    </div>
                  ) : (
                    <p className="text-xs font-bold leading-relaxed italic text-indigo-50 whitespace-pre-wrap">
                      {explanation}
                    </p>
                  )}
                  <div className="absolute bottom-0 right-0 w-20 h-20 bg-indigo-400/10 rounded-full blur-2xl"></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedScheme && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end justify-center p-0 animate-in fade-in duration-300">
          <div className="w-full max-w-md mx-auto bg-white rounded-t-[3.5rem] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 shadow-2xl relative">
            <div className="sticky top-0 bg-white p-6 pb-4 flex justify-between items-center border-b border-gray-50 z-10">
              <div>
                <h3 className="text-xl font-black text-gray-900 leading-tight pr-4">{selectedScheme.name}</h3>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Application Hub</p>
              </div>
              <button onClick={() => setSelectedScheme(null)} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:bg-gray-100 transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6 pb-20">
              <div>
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">About the Scheme</h5>
                <p className="text-sm font-medium text-gray-700 leading-relaxed">{selectedScheme.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100">
                  <Target size={24} className="text-indigo-700 mb-3" />
                  <h6 className="text-xs font-black text-gray-900 uppercase">Match Level</h6>
                  <p className="text-2xl font-black text-indigo-800">{selectedScheme.matchScore}%</p>
                </div>
                <div className="bg-green-50 p-5 rounded-3xl border border-green-100">
                  <ShieldCheck size={24} className="text-green-700 mb-3" />
                  <h6 className="text-xs font-black text-gray-900 uppercase">Status</h6>
                  <p className="text-sm font-black text-green-800 uppercase">Pre-Approved</p>
                </div>
              </div>

              <div>
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Required Documents</h5>
                <div className="space-y-3">
                  {selectedScheme.requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <CheckCircle2 size={18} className="text-green-600" />
                      <span className="text-sm font-bold text-gray-700">{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  onClick={handleAutoFill}
                  disabled={isApplying || applicationStatus === 'success'}
                  className={`w-full py-5 rounded-[2rem] font-black text-sm shadow-2xl transition-all flex items-center justify-center gap-3 ${applicationStatus === 'success'
                    ? 'bg-green-100 text-green-700 shadow-none'
                    : 'bg-green-700 text-white shadow-green-100 active:scale-95'
                    }`}
                >
                  {isApplying ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing Application...
                    </>
                  ) : applicationStatus === 'success' ? (
                    <>
                      <CheckCircle2 size={18} />
                      Application Pre-filled & Sent!
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> {t.auto_fill}
                    </>
                  )}
                </button>
                <a
                  href={selectedScheme.link}
                  target="_blank"
                  rel="noopener"
                  className="w-full py-4 border-2 border-gray-100 text-gray-900 rounded-[2rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  Official Portal <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchemeSetuScreen;
