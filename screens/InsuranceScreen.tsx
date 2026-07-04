import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import {
  Search,
  ShieldCheck,
  Leaf,
  Umbrella,
  CloudRain,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { insuranceService } from '../src/services/api';

const C = { primary: '#00BB78', dark: '#001A11', gray: '#616B68', mint: '#A5FFA7', bg: '#E8FBF3' };

interface InsuranceScreenProps {
  navigateTo: (screen: Screen) => void;
  t: any;
}

const InsuranceScreen: React.FC<InsuranceScreenProps> = ({ navigateTo, t }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [insurances, setInsurances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchInsurances(); }, []);

  useEffect(() => {
    const delay = setTimeout(() => fetchInsurances(searchQuery), 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const fetchInsurances = async (query: string = '') => {
    try {
      setLoading(true);
      const data = await insuranceService.search(query);
      setInsurances(data);
    } catch (error) {
      console.error('Failed to fetch insurances', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconAndColor = (type: string) => {
    if (type?.includes('Weather')) return { Icon: CloudRain, color: 'text-blue-600', bg: 'bg-blue-50' };
    if (type?.includes('Crop')) return { Icon: Leaf, color: 'text-green-600', bg: 'bg-green-50' };
    if (type?.includes('Livestock')) return { Icon: Umbrella, color: 'text-purple-600', bg: 'bg-purple-50' };
    return { Icon: ShieldCheck, color: 'text-orange-600', bg: 'bg-orange-50' };
  };

  return (
    <div className="bg-white min-h-full pb-28" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ─── HEADER ─── */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3 sticky top-0 bg-white z-10" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <button
          onClick={() => navigateTo('home')}
          className="w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-transform flex-shrink-0"
          style={{ background: '#F5F5F5', border: '1px solid #EBEBEB' }}
        >
          <ArrowLeft size={16} style={{ color: C.dark }} />
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: C.dark }}>Insurance Hub</h1>
          <p className="text-xs font-medium" style={{ color: C.gray }}>Protect your harvest &amp; livelihood</p>
        </div>
      </div>

      <div className="px-5 pt-4">
        {/* ─── SEARCH ─── */}
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5" style={{ background: '#F7F7F7', border: '1.5px solid #EBEBEB' }}>
          <Search size={16} style={{ color: C.gray, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search schemes, crops or coverage…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: C.dark }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ─── STATUS BANNER ─── */}
        <div className="flex items-center gap-3 p-4 rounded-2xl mb-5" style={{ background: C.bg, border: `1px solid ${C.mint}` }}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: C.primary }} />
          <div className="flex-1">
            <p className="text-xs font-bold" style={{ color: C.dark }}>PMFBY — Pradhan Mantri Fasal Bima Yojana</p>
            <p className="text-[11px] mt-0.5" style={{ color: C.gray }}>Government crop insurance scheme. Check eligibility below.</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ color: C.primary, background: '#fff' }}>Active</span>
        </div>

        {/* ─── LIST ─── */}
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 className="animate-spin text-green-600" size={28} />
            <p className="text-sm text-gray-500">Loading plans…</p>
          </div>
        ) : insurances.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <AlertCircle size={28} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No insurance plans found</p>
            <p className="text-xs text-gray-400">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insurances.map((ins) => {
              const { Icon, color, bg } = getIconAndColor(ins.type);
              return (
                <div
                  key={ins.id}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                >
                  {/* Card top */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                        <Icon size={18} className={color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 leading-snug">{ins.name}</h3>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                          {ins.type} · {ins.provider}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed mt-3">{ins.description}</p>

                    {/* Coverage / Premium row */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Coverage</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{ins.coverage}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-100" />
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Premium</p>
                        <p className="text-sm font-bold text-green-600 mt-0.5">{ins.premium}</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                <button
                  onClick={() => window.open(ins.link, '_blank')}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                  style={{ borderTop: '1px solid #F0F0F0', background: '#FAFAFA' }}
                >
                  <span className="text-sm font-semibold" style={{ color: C.dark }}>Explore Scheme</span>
                  <div className="flex items-center gap-1.5">
                    <ExternalLink size={14} style={{ color: C.gray }} />
                    <ChevronRight size={14} style={{ color: C.mint }} />
                  </div>
                </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InsuranceScreen;
