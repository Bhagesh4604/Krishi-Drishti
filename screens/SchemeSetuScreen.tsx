import React, { useState, useEffect } from 'react';
import { Screen, UserProfile, Scheme } from '../types';
import {
  ArrowLeft,
  Sparkles,
  ChevronRight,
  Landmark,
  CheckCircle2,
  Zap,
  X,
  Target,
  BrainCircuit,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { schemesService } from '../src/services/api';

const C = { primary: '#00BB78', dark: '#001A11', gray: '#616B68', mint: '#A5FFA7', bg: '#E8FBF3' };

interface SchemeSetuScreenProps {
  navigateTo: (screen: Screen) => void;
  user: UserProfile | null;
  t: any;
}

const SchemeSetuScreen: React.FC<SchemeSetuScreenProps> = ({ navigateTo, user, t }) => {
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'idle' | 'success'>('idle');

  useEffect(() => {
    const loadSchemes = async () => {
      try {
        const data = await schemesService.getSchemes();
        const mapped = data.map((s: any) => ({
          id: s.id.toString(),
          name: s.title,
          department: s.department || 'Govt of India',
          matchScore: s.match_score || (80 + parseInt(s.id?.toString() || '0') % 20),
          benefits: s.benefits || s.description,
          requirements: s.eligibility ? [s.eligibility] : ['Citizenship'],
          description: s.description,
          link: s.link || '#',
        }));
        setSchemes(mapped);
      } catch (e) {
        console.error('Failed to load schemes', e);
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
      Provide a concise, empathetic explanation in 3 bullet points.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setExplanation(response.text || 'You match based on your land size and crop choice.');
    } catch (err) {
      setExplanation('Unable to generate AI breakdown right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFill = async () => {
    if (!selectedScheme) return;
    setIsApplying(true);
    try {
      await schemesService.applyScheme(selectedScheme.id, selectedScheme.name);
      setApplicationStatus('success');
    } catch (error) {
      console.error('Failed to apply:', error);
    } finally {
      setIsApplying(false);
      setTimeout(() => setApplicationStatus('idle'), 3000);
    }
  };

  return (
    <div className="bg-white min-h-full flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ─── HEADER ─── */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3 sticky top-0 bg-white z-20" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <button
          onClick={() => navigateTo('home')}
          className="w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-transform flex-shrink-0"
          style={{ background: '#F5F5F5', border: '1px solid #EBEBEB' }}
        >
          <ArrowLeft size={16} style={{ color: C.dark }} />
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: C.dark }}>{t.scheme_setu || 'Scheme Setu'}</h1>
          <p className="text-xs font-semibold" style={{ color: C.primary }}>{t.matcher_tag || 'AI Policy Matcher'}</p>
        </div>
      </div>

      {/* ─── MATCH PROFILE CARD ─── */}
      <div className="mx-5 mt-4 mb-4 rounded-2xl p-4 flex items-center gap-4" style={{ background: C.dark }}>
        <div className="flex-shrink-0 text-center">
          <p className="text-[10px] font-medium mb-0.5" style={{ color: C.mint }}>Match</p>
          <span className="text-3xl font-bold text-white">94%</span>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-white">Your Profile</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {[user?.category, `${user?.land_size || '--'} Ac`, user?.farming_type].filter(Boolean).map((tag, i) => (
              <span key={i} className="text-[10px] font-medium text-gray-300 bg-white/10 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── SCHEME LIST ─── */}
      <div className="flex-1 overflow-y-auto px-5 pb-24 no-scrollbar">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
          {t.eligible_schemes || 'Eligible Schemes'}
        </p>

        <div className="space-y-3">
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white rounded-2xl overflow-hidden"
              style={{ border: '1px solid #F0F0F0', boxShadow: '0 1px 4px rgba(0,187,120,0.05)' }}
            >
              {/* Top section */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.bg }}>
                      <Landmark size={15} style={{ color: C.primary }} />
                    </div>
                    <span className="text-[11px] font-medium truncate" style={{ color: C.gray }}>{scheme.department}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: C.bg, border: `1px solid ${C.mint}` }}>
                    <Cpu size={10} style={{ color: C.primary }} />
                    <span className="text-[10px] font-bold" style={{ color: C.primary }}>{scheme.matchScore}%</span>
                  </div>
                </div>

                <h4 className="text-sm font-bold leading-snug" style={{ color: C.dark }}>{scheme.name}</h4>
                <p className="text-xs font-medium mt-1 leading-relaxed" style={{ color: C.primary }}>{scheme.benefits}</p>
              </div>

              {/* AI explanation */}
              {explainingId === scheme.id && (
                <div className="mx-4 mb-3 bg-indigo-900 rounded-xl p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">AI Breakdown</span>
                    </div>
                    <button onClick={() => setExplainingId(null)}>
                      <X size={13} className="text-white/40" />
                    </button>
                  </div>
                  {loading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 size={14} className="animate-spin text-indigo-300" />
                      <span className="text-xs text-indigo-300">Analyzing…</span>
                    </div>
                  ) : (
                    <p className="text-xs text-indigo-100 leading-relaxed whitespace-pre-wrap">{explanation}</p>
                  )}
                </div>
              )}

              {/* Action row */}
              <div className="flex items-center gap-2 px-4 pb-4">
                <button
                  onClick={() => setSelectedScheme(scheme)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white rounded-xl text-xs font-semibold active:scale-95 transition-transform"
                  style={{ background: C.dark }}
                >
                  Details <ChevronRight size={13} />
                </button>
                <button
                  onClick={() => fetchExplanation(scheme)}
                  className="w-11 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                  style={{ background: C.bg, border: `1px solid ${C.mint}` }}
                >
                  <BrainCircuit size={16} style={{ color: C.primary }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── DETAIL MODAL ─── */}
      {selectedScheme && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-end justify-center">
          <div className="w-full max-w-md bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 pr-4 leading-snug">{selectedScheme.name}</h3>
                <p className="text-xs text-indigo-600 font-semibold mt-0.5">Application Hub</p>
              </div>
              <button
                onClick={() => setSelectedScheme(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:scale-95 transition-transform"
              >
                <X size={15} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-6">
              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">About</p>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedScheme.description}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                  <Target size={18} className="text-indigo-600 mb-2" />
                  <p className="text-[10px] text-gray-500 font-medium uppercase">Match Level</p>
                  <p className="text-xl font-bold text-indigo-800 mt-0.5">{selectedScheme.matchScore}%</p>
                </div>
                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                  <ShieldCheck size={18} className="text-green-600 mb-2" />
                  <p className="text-[10px] text-gray-500 font-medium uppercase">Status</p>
                  <p className="text-sm font-bold text-green-700 mt-0.5">Pre-Approved</p>
                </div>
              </div>

              {/* Requirements */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Required Documents</p>
                <div className="space-y-2">
                  {selectedScheme.requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
                      <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 font-medium">{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleAutoFill}
                  disabled={isApplying || applicationStatus === 'success'}
                  className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{
                    background: applicationStatus === 'success' ? C.bg : C.primary,
                    color: applicationStatus === 'success' ? C.primary : '#fff',
                    border: applicationStatus === 'success' ? `1px solid ${C.mint}` : 'none',
                  }}
                >
                  {isApplying ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing…</>
                  ) : applicationStatus === 'success' ? (
                    <><CheckCircle2 size={16} /> Application Sent!</>
                  ) : (
                    <><Sparkles size={16} /> {t.auto_fill || 'Auto-fill Application'}</>
                  )}
                </button>

                <a
                  href={selectedScheme.link}
                  target="_blank"
                  rel="noopener"
                  className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  style={{ border: `1.5px solid #E0E0E0`, color: C.dark }}
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
