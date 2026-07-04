import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, Plus, X, Loader2,
  Copy, Share2, CheckCircle2,
  Trash2, ArrowRightLeft, Shield,
  Camera, AlertCircle, Link2
} from 'lucide-react';
import { Screen, HarvestToken, ChemicalInput } from '../types';
import { traceabilityService, plotService, carbonService, getUserLocation } from '../src/services/api';

interface Props {
  navigateTo: (screen: Screen, data?: any) => void;
  preSelectedProjectId?: number;
}

const INTRO_KEY = 'kd_trace_intro_seen_v2';

const CYCLE_STEPS = [
  { num: '01', title: 'Harvest', sub: 'After harvest, open Krishi Ledger and tap Mint.', icon: '🌾' },
  { num: '02', title: 'Mint Token', sub: 'The system creates a unique blockchain record.', icon: '🔗' },
  { num: '03', title: 'QR Code', sub: 'Your token gets a scannable provenance certificate.', icon: '▣' },
  { num: '04', title: 'Buyer Verifies', sub: 'Buyers scan the QR and instantly see your full record.', icon: '✓' },
];

const CycleIntro: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const current = CYCLE_STEPS[step];
  const isLast = step === CYCLE_STEPS.length - 1;

  const next = () => { if (isLast) { localStorage.setItem(INTRO_KEY, '1'); onDone(); } else setStep(s => s + 1); };
  const skip = () => { localStorage.setItem(INTRO_KEY, '1'); onDone(); };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl">
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E0E0E0' }} />
        <div className="flex justify-between items-center mb-5">
           <h3 className="text-lg font-black" style={{ color: '#001A11' }}>How it Works</h3>
           <button onClick={skip} className="text-xs font-bold" style={{ color: '#616B68' }}>Skip</button>
        </div>
        
        <div className="mb-8">
           <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl" style={{ background: '#E8FBF3', border: '1px solid #A5FFA7' }}>
                 {current.icon}
              </div>
           </div>
           <h4 className="text-center text-xl font-black mb-2" style={{ color: '#001A11' }}>{current.num}. {current.title}</h4>
           <p className="text-center text-sm font-medium" style={{ color: '#616B68' }}>{current.sub}</p>
        </div>

        <div className="flex gap-2 mb-6 justify-center">
           {CYCLE_STEPS.map((_, i) => (
             <div key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === step ? 24 : 8, background: i <= step ? '#00BB78' : '#EBEBEB' }} />
           ))}
        </div>

        <button onClick={next} className="w-full py-3.5 text-white text-sm font-bold rounded-2xl" style={{ background: '#001A11' }}>
           {isLast ? 'Get Started' : 'Next'}
        </button>
      </motion.div>
    </div>
  );
};

const QRPanel: React.FC<{ token: HarvestToken; onClose: () => void }> = ({ token, onClose }) => {
  const url = `${window.location.origin}?verify=${token.token_id}`;
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()} className="w-full max-w-xs bg-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 pb-4">
           <div className="flex justify-between items-start mb-4">
              <div>
                 <h4 className="font-black text-base" style={{ color: '#001A11' }}>Provenance QR</h4>
                 <p className="text-[10px] font-bold mt-0.5" style={{ color: '#00BB78' }}>{token.token_id}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50"><X size={14} /></button>
           </div>
           
           <div className="bg-white p-4 rounded-2xl flex justify-center mb-4" style={{ border: '1px solid #F0F0F0' }}>
              <QRCodeSVG value={url} size={160} level="H" fgColor="#001A11" />
           </div>
           
           <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-3 rounded-xl" style={{ background: '#F7F9F8' }}>
                 <p className="text-[10px] uppercase font-black" style={{ color: '#616B68' }}>Crop</p>
                 <p className="text-xs font-bold mt-0.5" style={{ color: '#001A11' }}>{token.crop_type}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: '#E8FBF3' }}>
                 <p className="text-[10px] uppercase font-black" style={{ color: '#616B68' }}>CO₂e</p>
                 <p className="text-xs font-bold mt-0.5" style={{ color: '#00BB78' }}>{token.carbon_footprint_kg_co2e.toFixed(1)}kg</p>
              </div>
           </div>
        </div>
        <div className="grid grid-cols-2 border-t border-gray-100">
           <button onClick={copy} className="py-4 text-xs font-bold flex justify-center items-center gap-2 border-r border-gray-100 transition-colors hover:bg-gray-50" style={{ color: '#001A11' }}>
             {copied ? <CheckCircle2 size={14} style={{ color: '#00BB78' }}/> : <Copy size={14}/>} {copied ? 'Copied' : 'Copy'}
           </button>
           <button onClick={() => navigator.share?.({ title: token.token_id, url }).catch(copy)} className="py-4 text-xs font-bold flex justify-center items-center gap-2 transition-colors hover:bg-green-50" style={{ color: '#00BB78' }}>
             <Share2 size={14}/> Share
           </button>
        </div>
      </motion.div>
    </div>
  );
};

const TransferPanel: React.FC<{ token: HarvestToken; onClose: () => void; onSuccess: () => void }> = ({ token, onClose, onSuccess }) => {
  const [buyerName, setBuyerName] = useState('');
  const [buyerEntity, setBuyerEntity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!buyerName.trim() || !buyerEntity.trim()) return;
    setLoading(true);
    try {
      await traceabilityService.transferToken(token.token_id, { buyer_name: buyerName, buyer_entity: buyerEntity, notes: notes || undefined });
      onSuccess(); onClose();
    } catch (e: any) { alert(e?.response?.data?.detail || 'Transfer failed'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full rounded-xl p-3.5 text-sm font-medium outline-none transition-all border border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-50 bg-gray-50";

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} onClick={e => e.stopPropagation()} className="w-full max-w-md bg-white rounded-t-3xl p-6 shadow-2xl">
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E0E0E0' }} />
        <h3 className="text-lg font-black mb-1" style={{ color: '#001A11' }}>Transfer Custody</h3>
        <p className="text-[11px] font-bold mb-5" style={{ color: '#00BB78' }}>{token.token_id}</p>

        <div className="p-3 mb-5 rounded-xl flex gap-3 items-start" style={{ background: '#FFF8EB' }}>
           <AlertCircle size={15} style={{ color: '#D97706', marginTop: 2 }} />
           <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>This action permanently transfers custody. An immutable log entry will be created.</p>
        </div>

        <div className="space-y-4 mb-6">
           <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Buyer Name</label>
              <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="e.g. Rajesh Kumar" className={inputClass} />
           </div>
           <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Company / Entity</label>
              <input value={buyerEntity} onChange={e => setBuyerEntity(e.target.value)} placeholder="e.g. ITC Agribusiness" className={inputClass} />
           </div>
           <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Notes (Optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Delivery terms..." className={inputClass} />
           </div>
        </div>

        <div className="flex gap-3">
           <button onClick={onClose} className="flex-1 py-3.5 text-sm font-bold rounded-2xl bg-gray-100 text-gray-600">Cancel</button>
           <button onClick={submit} disabled={loading || !buyerName || !buyerEntity} className="flex-1 py-3.5 text-sm font-bold rounded-2xl text-white disabled:opacity-50 flex justify-center items-center gap-2" style={{ background: '#001A11' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />} Transfer
           </button>
        </div>
      </motion.div>
    </div>
  );
};

const MintWizard: React.FC<{ plots: any[]; carbonProjects: any[]; onClose: () => void; onSuccess: () => void }> = ({ plots, carbonProjects, onClose, onSuccess }) => {
  const [step, setStep] = useState(0);
  const [plotId, setPlotId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [cropType, setCropType] = useState('');
  const [variety, setVariety] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [yieldKg, setYieldKg] = useState('');
  const [areaAcres, setAreaAcres] = useState('');
  const [inputs, setInputs] = useState<ChemicalInput[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedProject = carbonProjects.find(p => p.id === projectId);
  const methodology = selectedProject?.methodology || 'Mixed';
  const ef: Record<string, number> = { 'No-Till': 0.18, 'Cover-Crop': 0.21, 'Agroforestry': 0.14, 'Mixed': 0.28, 'Conventional': 0.35 };
  const co2 = parseFloat(yieldKg || '0') * (ef[methodology] || 0.28);
  const selectedPlot = plots.find(p => p.id === plotId);

  const steps = ['Field', 'Harvest', 'Inputs', 'Review'];
  const canNext = [
    plotId && cropType.trim() && harvestDate,
    yieldKg && parseFloat(yieldKg) > 0 && areaAcres && parseFloat(areaAcres) > 0,
    true,
    true,
  ];

  const mint = async () => {
    if (!plotId) return;
    setLoading(true);
    try {
      const loc = await getUserLocation().catch(() => ({ lat: undefined, lng: undefined }));
      await traceabilityService.mintToken({
        plot_id: plotId, crop_type: cropType, variety: variety || undefined,
        harvest_date: harvestDate, yield_kg: parseFloat(yieldKg),
        area_harvested_acres: parseFloat(areaAcres),
        chemical_inputs: inputs.filter(i => i.name.trim()),
        geo_lat: (loc as any).lat, geo_lng: (loc as any).lng,
        carbon_project_id: projectId || undefined,
      });
      onSuccess(); onClose();
    } catch (e: any) { alert(e?.response?.data?.detail || 'Minting failed'); }
    finally { setLoading(false); }
  };

  const inputCls = "w-full rounded-xl p-3.5 text-sm font-medium outline-none border border-gray-200 focus:border-green-500 bg-white shadow-sm";

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      <div className="px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 bg-white z-10" style={{ borderBottom: '1px solid #F0F0F0' }}>
         <div className="flex items-center gap-3">
            <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 border border-gray-200">
               <ArrowLeft size={16} style={{ color: '#001A11' }} />
            </button>
            <div>
               <h3 className="text-lg font-bold" style={{ color: '#001A11' }}>Mint Token</h3>
               <p className="text-[11px] font-semibold" style={{ color: '#00BB78' }}>Step {step + 1} of 4 · {steps[step]}</p>
            </div>
         </div>
         <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-800"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6" style={{ background: '#F7F9F8' }}>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                 <label className="text-xs font-bold uppercase tracking-wider block mb-3" style={{ color: '#616B68' }}>Select Farm Plot</label>
                 <div className="space-y-2">
                    {plots.length === 0 ? (
                       <div className="p-6 rounded-2xl border-2 border-dashed border-gray-200 text-center bg-white">
                          <p className="text-sm font-bold" style={{ color: '#001A11' }}>No Farm Plots Found</p>
                          <p className="text-xs mt-1" style={{ color: '#616B68' }}>You must register a farm plot before you can mint a token.</p>
                       </div>
                    ) : (
                       plots.map(p => (
                          <button key={p.id} onClick={() => { setPlotId(p.id); setCropType(p.crop_type || ''); setAreaAcres(String(p.area || '')); }}
                             className="w-full text-left p-4 rounded-2xl bg-white border transition-all flex justify-between items-center"
                             style={{ borderColor: plotId === p.id ? '#00BB78' : '#F0F0F0', boxShadow: plotId === p.id ? '0 0 0 4px rgba(0,187,120,0.1)' : 'none' }}>
                             <div>
                                <p className="text-sm font-bold" style={{ color: '#001A11' }}>{p.name}</p>
                                <p className="text-[11px] font-medium mt-0.5" style={{ color: '#616B68' }}>{p.area} ha · {p.crop_type || 'Mixed'}</p>
                             </div>
                             {plotId === p.id && <CheckCircle2 size={18} style={{ color: '#00BB78' }} />}
                          </button>
                       ))
                    )}
                 </div>
              </div>

              <div>
                 <label className="text-xs font-bold uppercase tracking-wider block mb-3" style={{ color: '#616B68' }}>Link Carbon Project (Optional)</label>
                 <div className="space-y-2">
                    <button onClick={() => setProjectId(null)} className="w-full text-left p-4 rounded-2xl bg-white border transition-all" style={{ borderColor: !projectId ? '#00BB78' : '#F0F0F0' }}>
                       <p className="text-sm font-bold" style={{ color: '#001A11' }}>None</p>
                    </button>
                    {carbonProjects.filter(p => p.status === 'Verified' || p.status === 'Issued').map(p => (
                       <button key={p.id} onClick={() => setProjectId(p.id)} className="w-full text-left p-4 rounded-2xl bg-white border transition-all flex justify-between items-center" style={{ borderColor: projectId === p.id ? '#00BB78' : '#F0F0F0' }}>
                          <div>
                             <p className="text-sm font-bold" style={{ color: '#001A11' }}>{p.plot_name}</p>
                             <p className="text-[11px] font-medium mt-0.5" style={{ color: '#616B68' }}>{p.methodology}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700">{p.available_credits?.toFixed(2)} ACT</span>
                       </button>
                    ))}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Crop Type</label>
                    <input value={cropType} onChange={e => setCropType(e.target.value)} placeholder="e.g. Wheat" className={inputCls} />
                 </div>
                 <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Variety</label>
                    <input value={variety} onChange={e => setVariety(e.target.value)} placeholder="Optional" className={inputCls} />
                 </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                 <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Harvest Date</label>
                 <input type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                 <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Total Yield (kg)</label>
                 <input type="number" value={yieldKg} onChange={e => setYieldKg(e.target.value)} placeholder="0" className={inputCls} />
              </div>
              <div>
                 <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Area Harvested (ha)</label>
                 <input type="number" value={areaAcres} onChange={e => setAreaAcres(e.target.value)} placeholder="0.0" className={inputCls} />
              </div>

              {parseFloat(yieldKg) > 0 && (
                 <div className="p-4 rounded-2xl bg-white border border-green-100 flex items-center justify-between shadow-sm">
                    <div>
                       <p className="text-[10px] uppercase font-black" style={{ color: '#616B68' }}>Computed CO₂e</p>
                       <p className="text-2xl font-black mt-1" style={{ color: '#00BB78' }}>{co2.toFixed(1)} <span className="text-sm font-medium">kg</span></p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] uppercase font-black" style={{ color: '#616B68' }}>Methodology</p>
                       <p className="text-xs font-bold mt-1" style={{ color: '#001A11' }}>{methodology}</p>
                    </div>
                 </div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                 <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: '#616B68' }}>Chemical Inputs</label>
                 <button onClick={() => setInputs(p => [...p, { name: '', quantity: '', unit: 'kg/ha', applied_date: harvestDate }])} className="text-xs font-bold text-green-600 flex items-center gap-1">
                    <Plus size={14} /> Add Input
                 </button>
              </div>

              {inputs.length === 0 ? (
                 <div className="p-8 rounded-3xl border-2 border-dashed border-gray-200 text-center bg-white">
                    <p className="text-sm font-bold" style={{ color: '#001A11' }}>No inputs declared</p>
                    <p className="text-xs mt-1" style={{ color: '#616B68' }}>Leave empty for organic certification</p>
                 </div>
              ) : (
                 <div className="space-y-3">
                    {inputs.map((inp, i) => (
                       <div key={i} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3">
                          <div className="flex justify-between">
                             <input value={inp.name} onChange={e => setInputs(p => p.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} placeholder="Chemical Name" className="text-sm font-bold outline-none flex-1 bg-transparent" />
                             <button onClick={() => setInputs(p => p.filter((_, idx) => idx !== i))} className="text-red-400 p-1"><Trash2 size={16} /></button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                             <input value={inp.quantity} onChange={e => setInputs(p => p.map((x, idx) => idx === i ? { ...x, quantity: e.target.value } : x))} placeholder="Quantity" className="text-sm font-medium outline-none bg-gray-50 p-2.5 rounded-xl border border-gray-100" />
                             <select value={inp.unit} onChange={e => setInputs(p => p.map((x, idx) => idx === i ? { ...x, unit: e.target.value } : x))} className="text-sm font-medium outline-none bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                <option>kg/ha</option><option>L/ha</option>
                             </select>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="p-5 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-4">
                 <h4 className="text-sm font-black uppercase tracking-widest border-b border-gray-100 pb-3" style={{ color: '#001A11' }}>Summary</h4>
                 {[
                    ['Plot', selectedPlot?.name],
                    ['Crop', `${cropType} ${variety}`],
                    ['Yield', `${yieldKg} kg`],
                    ['Carbon Footprint', `${co2.toFixed(2)} kg CO₂e`],
                    ['Chemical Inputs', inputs.length > 0 ? `${inputs.length} items` : 'None (Organic)'],
                 ].map(([k, v], i) => (
                    <div key={i} className="flex justify-between text-sm">
                       <span className="font-semibold" style={{ color: '#616B68' }}>{k}</span>
                       <span className="font-bold" style={{ color: '#001A11' }}>{v}</span>
                    </div>
                 ))}
              </div>

              <div className="p-4 rounded-2xl flex gap-3 items-start" style={{ background: '#FFF8EB' }}>
                 <AlertCircle size={16} style={{ color: '#D97706', marginTop: 2 }} />
                 <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>By minting, you declare all information accurate. An immutable blockchain entry will be created.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-5 bg-white border-t border-gray-100 flex gap-3">
         {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext[step]} className="flex-1 py-3.5 rounded-2xl text-white text-sm font-bold disabled:opacity-50 transition-all" style={{ background: '#001A11' }}>
               Continue
            </button>
         ) : (
            <button onClick={mint} disabled={loading} className="flex-1 py-3.5 rounded-2xl text-white text-sm font-bold disabled:opacity-50 transition-all flex justify-center items-center gap-2" style={{ background: '#00BB78' }}>
               {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />} Mint Token
            </button>
         )}
      </div>
    </div>
  );
};

const TraceabilityScreen: React.FC<Props> = ({ navigateTo, preSelectedProjectId }) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'chain'>('ledger');
  const [tokens, setTokens] = useState<HarvestToken[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [carbonProjects, setCarbonProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMint, setShowMint] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedToken, setSelectedToken] = useState<HarvestToken | null>(null);
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem(INTRO_KEY));

  const load = async () => {
    setLoading(true);
    try {
      const [t, p, c] = await Promise.all([traceabilityService.getMyTokens(), plotService.getPlots(), carbonService.getProjects()]);
      setTokens(t); setPlots(p); setCarbonProjects(c);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (preSelectedProjectId) setShowMint(true); }, [preSelectedProjectId]);

  const totalYield = tokens.reduce((s, t) => s + t.yield_kg, 0);
  const totalCO2 = tokens.reduce((s, t) => s + t.carbon_footprint_kg_co2e, 0);
  const activeCount = tokens.filter(t => t.status === 'Minted').length;

  return (
    <div className="h-full flex flex-col overflow-hidden relative" style={{ background: '#F7F9F8', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── HEADER ── */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between bg-white sticky top-0 z-10" style={{ borderBottom: '1px solid #F0F0F0' }}>
         <div className="flex items-center gap-3">
            <button onClick={() => navigateTo('home')} className="w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-transform flex-shrink-0 bg-gray-50 border border-gray-200">
               <ArrowLeft size={16} style={{ color: '#001A11' }} />
            </button>
            <div>
               <h2 className="text-lg font-bold" style={{ color: '#001A11' }}>Supply Chain</h2>
               <p className="text-[11px] font-semibold" style={{ color: '#00BB78' }}>Traceability Ledger</p>
            </div>
         </div>
         <button onClick={() => setShowMint(true)} className="w-8 h-8 flex items-center justify-center rounded-full text-white shadow-md active:scale-95 transition-transform" style={{ background: '#00BB78' }}>
            <Plus size={16} />
         </button>
      </div>

      {/* ── HERO STATS CARD ── */}
      <div className="mx-5 mt-4 rounded-3xl p-5 relative overflow-hidden" style={{ background: '#001A11' }}>
         <div className="flex justify-between items-start">
            <div>
               <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#616B68' }}>Total Yield Tracked</p>
               <h3 className="text-4xl font-black text-white mt-0.5">{(totalYield / 1000).toFixed(1)}<span className="text-lg ml-1 text-gray-400">t</span></h3>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#616B68' }}>Active</p>
               <p className="text-xl font-black mt-0.5" style={{ color: '#00BB78' }}>{activeCount}</p>
            </div>
         </div>
         <div className="mt-4 pt-4 flex gap-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
               <p className="text-[10px]" style={{ color: '#616B68' }}>Tokens Minted</p>
               <p className="text-sm font-bold text-white">{tokens.length}</p>
            </div>
            <div>
               <p className="text-[10px]" style={{ color: '#616B68' }}>Total CO₂e</p>
               <p className="text-sm font-bold text-white">{totalCO2.toFixed(0)} kg</p>
            </div>
         </div>
         <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full" style={{ background: 'rgba(0,187,120,0.08)' }} />
      </div>

      {/* ── TABS ── */}
      <div className="mx-5 mt-4 p-1 rounded-2xl flex gap-1" style={{ background: '#EFEFEF' }}>
         <button onClick={() => setActiveTab('ledger')} className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all" style={{ background: activeTab === 'ledger' ? '#fff' : 'transparent', color: activeTab === 'ledger' ? '#001A11' : '#616B68', boxShadow: activeTab === 'ledger' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            Ledger
         </button>
         <button onClick={() => setActiveTab('chain')} className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all" style={{ background: activeTab === 'chain' ? '#fff' : 'transparent', color: activeTab === 'chain' ? '#001A11' : '#616B68', boxShadow: activeTab === 'chain' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            Block Explorer
         </button>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-24 space-y-4">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #E8FBF3', borderTopColor: '#00BB78' }} />
              <p className="text-sm font-medium" style={{ color: '#616B68' }}>Syncing ledger…</p>
           </div>
        ) : tokens.length === 0 ? (
           <div className="py-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-2xl">🌱</div>
              <h3 className="text-base font-bold" style={{ color: '#001A11' }}>Ledger Empty</h3>
              <p className="text-sm font-medium mt-1 mb-6 px-4" style={{ color: '#616B68' }}>Mint your first harvest token to begin CBAM compliant tracking.</p>
              <button onClick={() => setShowMint(true)} className="py-3 px-6 rounded-xl text-white text-sm font-bold shadow-md" style={{ background: '#00BB78' }}>
                 Mint First Token
              </button>
           </div>
        ) : activeTab === 'ledger' ? (
           <div className="space-y-4">
              {tokens.map(token => (
                 <div key={token.token_id} className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
                    <div className="p-4 border-b border-gray-50">
                       <div className="flex justify-between items-start mb-3">
                          <div>
                             <h4 className="font-bold text-sm" style={{ color: '#001A11' }}>{token.crop_type} {token.variety ? `· ${token.variety}` : ''}</h4>
                             <p className="text-[11px] mt-0.5" style={{ color: '#616B68' }}>{token.plot_name} · {new Date(token.harvest_date).toLocaleDateString()}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex-shrink-0" style={{ background: token.status === 'Minted' ? '#E8FBF3' : '#F5F5F5', color: token.status === 'Minted' ? '#00BB78' : '#616B68' }}>
                             {token.status}
                          </span>
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                          <div className="p-2.5 rounded-xl bg-gray-50">
                             <p className="text-[9px] uppercase font-black" style={{ color: '#616B68' }}>Yield</p>
                             <p className="text-xs font-black mt-0.5" style={{ color: '#001A11' }}>{token.yield_kg.toLocaleString()} kg</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-gray-50">
                             <p className="text-[9px] uppercase font-black" style={{ color: '#616B68' }}>CO₂e</p>
                             <p className="text-xs font-black mt-0.5" style={{ color: '#001A11' }}>{token.carbon_footprint_kg_co2e.toFixed(1)} kg</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-gray-50">
                             <p className="text-[9px] uppercase font-black" style={{ color: '#616B68' }}>Credits</p>
                             <p className="text-xs font-black mt-0.5" style={{ color: '#00BB78' }}>{token.carbon_credits_linked || 0} ACT</p>
                          </div>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-100 bg-gray-50">
                       <button onClick={() => { setSelectedToken(token); setShowQR(true); }} className="py-3 text-[11px] font-bold flex justify-center items-center gap-1.5 transition-colors hover:bg-gray-100" style={{ color: '#001A11' }}>
                          <Copy size={12} /> View QR
                       </button>
                       {token.status === 'Minted' ? (
                          <button onClick={() => { setSelectedToken(token); setShowTransfer(true); }} className="py-3 text-[11px] font-bold flex justify-center items-center gap-1.5 transition-colors hover:bg-green-50" style={{ color: '#00BB78' }}>
                             <ArrowRightLeft size={12} /> Transfer
                          </button>
                       ) : (
                          <button onClick={() => navigateTo('trace-verify', { tokenId: token.token_id })} className="py-3 text-[11px] font-bold flex justify-center items-center gap-1.5 transition-colors hover:bg-gray-100" style={{ color: '#616B68' }}>
                             <Shield size={12} /> Verify
                          </button>
                       )}
                    </div>
                 </div>
              ))}
           </div>
        ) : (
           <div className="pl-4 py-2 border-l-2 border-gray-200 ml-4 space-y-6">
              {[...tokens].sort((a,b) => a.sequence_number - b.sequence_number).map(token => (
                 <div key={token.token_id} className="relative">
                    <div className="absolute -left-6 w-4 h-4 rounded-full bg-white border-4 top-1" style={{ borderColor: '#00BB78' }} />
                    <div className="bg-white p-4 rounded-2xl border shadow-sm ml-2" style={{ borderColor: '#F0F0F0' }}>
                       <p className="text-[9px] font-black uppercase tracking-wider mb-1" style={{ color: '#00BB78' }}>Block #{token.sequence_number}</p>
                       <h4 className="text-sm font-bold" style={{ color: '#001A11' }}>{token.token_id}</h4>
                       <p className="text-xs font-mono text-gray-400 mt-2 break-all">{token.token_hash?.slice(0,32)}...</p>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>

      <AnimatePresence>
         {showIntro && <CycleIntro onDone={() => setShowIntro(false)} />}
         {showMint && <MintWizard plots={plots} carbonProjects={carbonProjects} onClose={() => setShowMint(false)} onSuccess={load} />}
         {showQR && selectedToken && <QRPanel token={selectedToken} onClose={() => setShowQR(false)} />}
         {showTransfer && selectedToken && <TransferPanel token={selectedToken} onClose={() => setShowTransfer(false)} onSuccess={load} />}
      </AnimatePresence>
    </div>
  );
};

export default TraceabilityScreen;
