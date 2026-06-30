import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Filter, ShieldCheck, MapPin, 
  Leaf, Package, FileText, CheckCircle2, ChevronRight,
  User, Factory, BarChart3, AlertCircle, Loader2, QrCode
} from 'lucide-react';
import { Screen } from '../types';
import { marketplaceService } from '../src/services/api';

interface Props {
  navigateTo: (screen: Screen, data?: any) => void;
  t?: any;
}

const FarmerMarketplaceScreen: React.FC<Props> = ({ navigateTo, t }) => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [selectedToken, setSelectedToken] = useState<any | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const data = await marketplaceService.getTokens();
      setTokens(data);
    } catch (e) {
      console.error("Failed to fetch marketplace tokens:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredTokens = tokens.filter(tok => 
    tok.crop_type.toLowerCase().includes(searchQ.toLowerCase()) || 
    (tok.variety && tok.variety.toLowerCase().includes(searchQ.toLowerCase())) ||
    tok.token_id.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white px-4 pt-5 pb-4 shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigateTo('home')} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Public Marketplace</p>
            <h1 className="text-gray-900 text-xl font-black">Direct Farm Traceability</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 border border-gray-200">
          <Search size={16} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search crop, variety, or Token ID..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-500 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" /></div>
        ) : filteredTokens.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No verified crops available right now.</p>
          </div>
        ) : (
          filteredTokens.map((token) => (
            <motion.div
              key={token.token_id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedToken(token)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    {token.crop_type} <span className="font-normal text-gray-500 text-sm">({token.variety || 'Standard'})</span>
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                    <MapPin size={12} />
                    <span>{token.farmer_district} · Farm of {token.farmer_initials}</span>
                  </div>
                </div>
                <div className="bg-green-50 text-green-700 px-2 py-1 rounded-lg border border-green-200 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  <span className="text-[10px] font-black uppercase">Verified</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
                  <p className="text-[9px] text-gray-500 font-bold uppercase">Yield</p>
                  <p className="text-sm font-black text-gray-900">{token.yield_kg.toLocaleString()} kg</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
                  <p className="text-[9px] text-gray-500 font-bold uppercase">Harvest Date</p>
                  <p className="text-sm font-black text-gray-900">{new Date(token.harvest_date).toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
                  <p className="text-[9px] text-gray-500 font-bold uppercase">Carbon Footprint</p>
                  <p className="text-sm font-black text-gray-900 text-emerald-600">{token.carbon_footprint_kg_co2e.toFixed(0)} kg CO₂e</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1 text-gray-400">
                  <QrCode size={14} />
                  <span className="text-[10px] font-mono">{token.token_id}</span>
                </div>
                <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                  View Provenance <ChevronRight size={14} />
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ── Token Detail Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedToken && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: '#00000080', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedToken(null)}
          >
            <motion.div
              initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-green-600 p-6 text-white">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-black">{selectedToken.crop_type}</h2>
                    <p className="text-green-100">{selectedToken.variety || 'Standard Variety'}</p>
                  </div>
                  <div className="bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                    <span className="text-xs font-bold">Token {selectedToken.sequence_number}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm font-medium">
                  <div className="flex items-center gap-1.5">
                    <Package size={16} /> {selectedToken.yield_kg.toLocaleString()} kg
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User size={16} /> Farmer {selectedToken.farmer_initials}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Cryptographic Proof */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-green-500" />
                    Cryptographic Provenance
                  </h4>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-gray-500 font-bold">Token ID</span>
                      <span className="text-[10px] font-mono text-gray-900">{selectedToken.token_id}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-gray-500 font-bold">Minted At</span>
                      <span className="text-[10px] font-mono text-gray-900">{new Date(selectedToken.minted_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-[10px] text-gray-500 font-bold mb-0.5">SHA-256 Hash</p>
                      <p className="text-[8px] font-mono text-gray-400 break-all">{selectedToken.token_hash}</p>
                    </div>
                  </div>
                </div>

                {/* Crop Cycle Timeline */}
                {selectedToken.crop_cycle && selectedToken.crop_cycle.events.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Audited Farm Timeline</h4>
                    <div className="pl-4 border-l-2 border-gray-100 space-y-4">
                      {selectedToken.crop_cycle.events.map((ev: any, i: number) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-white" />
                          <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-bold text-gray-900">{ev.type}</span>
                              <span className="text-[10px] text-gray-500">{new Date(ev.date).toLocaleDateString()}</span>
                            </div>
                            {ev.lat && ev.lng && (
                              <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                <MapPin size={10} /> {ev.lat.toFixed(4)}, {ev.lng.toFixed(4)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sustainability Metrics */}
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Leaf size={16} className="text-emerald-600" />
                    <h4 className="text-sm font-bold text-emerald-900">Sustainability Profile</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Methodology</p>
                      <p className="text-sm font-black text-emerald-900">{selectedToken.farming_methodology || 'Mixed'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Carbon Footprint</p>
                      <p className="text-sm font-black text-emerald-900">{selectedToken.carbon_footprint_kg_co2e.toFixed(1)} kg CO₂e</p>
                    </div>
                    {selectedToken.ndvi_at_harvest && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-emerald-600 font-bold uppercase">Harvest Health (NDVI)</p>
                        <div className="w-full bg-emerald-200 h-2 rounded-full mt-1">
                          <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${selectedToken.ndvi_at_harvest * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-gray-100 bg-white">
                <button
                  onClick={() => alert("Direct B2B purchasing integration placeholder. In a production app, this would route to a Smart Contract or Escrow payment gateway.")}
                  className="w-full py-4 rounded-xl bg-gray-900 text-white font-black hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20"
                >
                  Initiate Direct Purchase
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FarmerMarketplaceScreen;
