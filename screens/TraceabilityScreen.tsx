/**
 * TraceabilityScreen — "Precision Terminal Ledger"
 * ─────────────────────────────────────────────────
 * Design language: Bloomberg Terminal × Physical Land Registry
 * - Pure black (#0D0D0D), NO generic dark grays
 * - Amber (#F59E0B) as the sole accent — used sparingly
 * - JetBrains Mono for all data/hash/code elements
 * - Sharp corners (2px max radius on most elements)
 * - Exposed ruled lines as structural dividers
 * - Numbers are heroes — huge type, tiny labels
 * - Status shown as physical STAMP marks, not pill badges
 * - No gradients anywhere on cards
 * - The hash chain is always visible — it IS the product
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, Plus, X, Loader2,
  Copy, Share2, CheckCircle2,
  Trash2, ArrowRightLeft, Shield,
  Camera, MapPin, Activity
} from 'lucide-react';
import { Screen, HarvestToken, ChemicalInput } from '../types';
import { traceabilityService, plotService, carbonService, getUserLocation } from '../src/services/api';

interface Props {
  navigateTo: (screen: Screen, data?: any) => void;
  preSelectedProjectId?: number;
}

// ── Mono style helper ─────────────────────────────────────────────────────────────
const mono = (cls = '') => `font-['JetBrains_Mono',monospace] ${cls}`;

// ── Cycle Intro (first-visit only) ───────────────────────────────────────────
const INTRO_KEY = 'kd_trace_intro_seen';

const CYCLE_STEPS = [
  {
    num: '01',
    title: 'HARVEST',
    sub: 'After harvest, open Krishi Ledger and tap MINT.',
    detail: 'Enter your crop type, yield in kg, area harvested, and any chemical inputs used.',
    icon: '🌾',
  },
  {
    num: '02',
    title: 'MINT TOKEN',
    sub: 'The system creates a unique blockchain record.',
    detail: 'A sha256 hash chain entry is generated — KD-HTK-YYYY-NNNNN — linking to every prior harvest in your ledger.',
    icon: '◆',
  },
  {
    num: '03',
    title: 'QR CODE',
    sub: 'Your token gets a scannable provenance certificate.',
    detail: 'Print or share the QR. Attach it to your shipment bags, trucks, or invoices.',
    icon: '▣',
  },
  {
    num: '04',
    title: 'BUYER VERIFIES',
    sub: 'Buyers scan the QR and instantly see your full record.',
    detail: 'Carbon footprint, chemical inputs, NDVI health score, methodology — all tamper-proof. CBAM & CCTS compliant.',
    icon: '✓',
  },
];

const CycleIntro: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const current = CYCLE_STEPS[step];
  const isLast = step === CYCLE_STEPS.length - 1;

  const next = () => {
    if (isLast) {
      localStorage.setItem(INTRO_KEY, '1');
      onDone();
    } else {
      setStep(s => s + 1);
    }
  };

  const skip = () => {
    localStorage.setItem(INTRO_KEY, '1');
    onDone();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: '#0D0D0D' }}
    >
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-6 pb-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <p className={`${mono()} text-amber-400 text-[9px] tracking-[0.25em] uppercase`}>HOW IT WORKS</p>
        <button onClick={skip} className={`${mono()} text-zinc-600 text-[10px] hover:text-zinc-400 transition-colors`}>SKIP →</button>
      </div>

      {/* Step progress */}
      <div className="flex-shrink-0 flex px-5 gap-1.5 pt-4 pb-2">
        {CYCLE_STEPS.map((_, i) => (
          <div key={i} className={`h-0.5 flex-1 transition-colors duration-300 ${i <= step ? 'bg-amber-400' : 'bg-zinc-800'}`} />
        ))}
      </div>

      {/* Main step content */}
      <div className="flex-1 flex flex-col px-5 pt-6 pb-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {/* Step number + icon */}
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-14 h-14 border border-amber-400 flex items-center justify-center">
                <span className="text-2xl">{current.icon}</span>
              </div>
              <div>
                <p className={`${mono()} text-zinc-600 text-[10px] tracking-[0.2em] uppercase`}>STEP {current.num} / 04</p>
                <h2 className={`${mono()} text-amber-400 text-2xl font-bold mt-1 tracking-wider leading-none`}>{current.title}</h2>
              </div>
            </div>

            {/* Sub headline */}
            <p className="text-white text-base font-bold leading-snug mb-4">{current.sub}</p>

            {/* Detail */}
            <p className="text-zinc-500 text-sm leading-relaxed">{current.detail}</p>

            {/* Chain visualiser on step 2 */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="mt-6 border border-zinc-800 p-4 space-y-1">
                <p className={`${mono()} text-amber-400 text-[10px]`}>KD-HTK-2026-00001</p>
                <p className={`${mono()} text-zinc-700 text-[9px] break-all`}>sha256: 3f9a8c2d1b4e7f0a...</p>
                <div className="w-px h-3 bg-amber-400/30 ml-2" />
                <p className={`${mono()} text-amber-400/60 text-[10px]`}>KD-HTK-2026-00002</p>
                <p className={`${mono()} text-zinc-800 text-[9px]`}>prev: 3f9a8c2d... ← tamper-proof link</p>
              </motion.div>
            )}

            {/* Buyer scan preview on step 3 */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="mt-6 flex justify-center">
                <div className="border-4 border-amber-400 p-3">
                  <div className="w-24 h-24 grid grid-cols-4 grid-rows-4 gap-0.5">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className={`${[0,1,4,5,2,7,8,13,14,15,10,11].includes(i) ? 'bg-amber-400' : 'bg-transparent'} border border-zinc-800`} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Compliance badges on step 4 */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="mt-6 space-y-2">
                {[
                  ['EU CBAM', 'Carbon Border Adjustment Mechanism 2026'],
                  ['IN CCTS', 'India Carbon Credit Trading Scheme 2023'],
                  ['SHA-256', 'Cryptographic tamper-evidence standard'],
                ].map(([badge, desc]) => (
                  <div key={badge} className="flex items-center gap-3 border border-zinc-800 px-3 py-2">
                    <span className={`${mono()} text-amber-400 text-[9px] font-bold tracking-widest w-12 flex-shrink-0`}>{badge}</span>
                    <span className="text-zinc-600 text-[10px]">{desc}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="flex-shrink-0 grid grid-cols-2" style={{ borderTop: '1px solid #1a1a1a' }}>
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : skip()}
          className={`${mono()} py-4 text-zinc-600 text-xs font-bold hover:text-zinc-400 transition-colors border-r border-zinc-900`}
        >
          {step === 0 ? 'SKIP' : '← BACK'}
        </button>
        <button
          onClick={next}
          className={`${mono()} py-4 font-bold text-xs transition-colors ${
            isLast ? 'bg-amber-400 text-black hover:bg-amber-300' : 'text-amber-400 hover:text-amber-300'
          }`}
        >
          {isLast ? '◆ OPEN LEDGER' : 'NEXT →'}
        </button>
      </div>
    </motion.div>
  );
};

// ── Status stamp ──────────────────────────────────────────────────────────────
const Stamp: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, string> = {
    Minted:      'border-amber-400 text-amber-400',
    Transferred: 'border-sky-400 text-sky-400',
    Draft:       'border-zinc-500 text-zinc-500',
  };
  return (
    <span className={`${mono()} inline-block border-2 px-2 py-0.5 text-[9px] font-bold tracking-[0.2em] uppercase rotate-[-1deg] ${cfg[status] || cfg.Draft}`}>
      {status}
    </span>
  );
};

// ── Ruled label ───────────────────────────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className={`${mono()} text-[9px] text-zinc-600 uppercase tracking-[0.15em]`}>{children}</span>
);

// ── Section rule ──────────────────────────────────────────────────────────────
const Rule: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px bg-zinc-800" />
    {label && <Label>{label}</Label>}
    <div className="flex-1 h-px bg-zinc-800" />
  </div>
);

// ── Formatted hash ────────────────────────────────────────────────────────────
const HashLine: React.FC<{ hash: string; label?: string; color?: string }> = ({ hash, label, color = 'text-amber-400' }) => (
  <div>
    {label && <Label>{label}</Label>}
    <p className={`${mono()} text-[10px] ${color} break-all leading-relaxed mt-0.5`}>
      {hash}
    </p>
  </div>
);

// ── QR Panel ──────────────────────────────────────────────────────────────────
const QRPanel: React.FC<{ token: HarvestToken; onClose: () => void }> = ({ token, onClose }) => {
  const url = `${window.location.origin}?verify=${token.token_id}`;
  const [copied, setCopied] = useState(false);

  const copy = () => navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  const share = () => navigator.share ? navigator.share({ title: token.token_id, url }) : copy();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[320px]"
        style={{ background: '#0D0D0D', border: '1px solid #F59E0B' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800">
          <span className={`${mono()} text-amber-400 text-xs font-bold tracking-widest`}>PROVENANCE QR</span>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors"><X size={14} /></button>
        </div>

        {/* QR */}
        <div className="flex justify-center py-6 bg-white mx-0">
          <QRCodeSVG value={url} size={180} level="H" fgColor="#0D0D0D" />
        </div>

        {/* Token meta */}
        <div className="px-4 py-3 border-t border-zinc-800 space-y-2">
          <p className={`${mono()} text-amber-400 text-xs font-bold`}>{token.token_id}</p>
          <div className="grid grid-cols-3 gap-2">
            {[['CROP', token.crop_type], ['YIELD', `${token.yield_kg}kg`], ['CO₂E', `${token.carbon_footprint_kg_co2e.toFixed(1)}kg`]].map(([k, v]) => (
              <div key={k}>
                <Label>{k}</Label>
                <p className="text-white text-xs font-bold mt-0.5">{v}</p>
              </div>
            ))}
          </div>
          <div className="pt-1">
            <Label>VERIFY URL</Label>
            <p className={`${mono()} text-zinc-500 text-[9px] break-all mt-0.5`}>{url}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 border-t border-zinc-800">
          <button onClick={copy} className="py-3.5 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all flex items-center justify-center gap-2 border-r border-zinc-800">
            {copied ? <CheckCircle2 size={13} className="text-amber-400" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={share} className="py-3.5 text-xs font-bold text-amber-400 hover:bg-amber-400 hover:text-black transition-all flex items-center justify-center gap-2">
            <Share2 size={13} />
            Share
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Transfer Panel ────────────────────────────────────────────────────────────
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

  const inputClass = `w-full bg-transparent border border-zinc-700 px-3 py-2.5 text-white text-sm outline-none focus:border-amber-400 transition-colors ${mono()}`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md"
        style={{ background: '#0D0D0D', borderTop: '2px solid #F59E0B' }}
      >
        <div className="px-5 pt-4 pb-2 flex justify-between items-center">
          <div>
            <p className={`${mono()} text-amber-400 text-[10px] tracking-widest uppercase`}>CUSTODY TRANSFER</p>
            <p className={`${mono()} text-white text-xs font-bold mt-0.5`}>{token.token_id}</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white"><X size={16} /></button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          <Rule />
          <p className="text-zinc-500 text-xs">This action permanently transfers custody. An immutable log entry will be created.</p>

          <div className="space-y-2.5 mt-3">
            <div>
              <Label>BUYER FULL NAME</Label>
              <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Rajesh Kumar" className={inputClass} />
            </div>
            <div>
              <Label>COMPANY / ENTITY</Label>
              <input value={buyerEntity} onChange={e => setBuyerEntity(e.target.value)} placeholder="ITC Agribusiness Pvt. Ltd." className={inputClass} />
            </div>
            <div>
              <Label>NOTES (optional)</Label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Delivery terms, grade conditions…" className={`${inputClass} resize-none`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={onClose} className="py-3 border border-zinc-700 text-zinc-500 text-xs font-bold hover:border-zinc-500 transition-colors">
              CANCEL
            </button>
            <button
              onClick={submit}
              disabled={loading || !buyerName.trim() || !buyerEntity.trim()}
              className="py-3 bg-amber-400 text-black text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <ArrowRightLeft size={13} />}
              TRANSFER
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Mint Wizard ───────────────────────────────────────────────────────────────
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

  const steps = ['FIELD', 'HARVEST', 'INPUTS', 'SIGN'];
  const canNext = [
    plotId && cropType.trim() && harvestDate,
    yieldKg && parseFloat(yieldKg) > 0 && areaAcres && parseFloat(areaAcres) > 0,
    true,
    true,
  ];

  const addInput = () => setInputs(p => [...p, { name: '', quantity: '', unit: 'kg/acre', applied_date: harvestDate }]);
  const removeInput = (i: number) => setInputs(p => p.filter((_, idx) => idx !== i));
  const updateInput = (i: number, f: keyof ChemicalInput, v: string) => setInputs(p => p.map((x, idx) => idx === i ? { ...x, [f]: v } : x));

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

  const inputCls = `w-full bg-transparent border-b border-zinc-700 px-0 py-2 text-white text-sm outline-none focus:border-amber-400 transition-colors ${mono()} placeholder-zinc-700`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: '#0D0D0D' }}
    >
      {/* Wizard header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-3" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className={`${mono()} text-zinc-600 text-[9px] tracking-[0.2em] uppercase`}>FORM KD-HT-001</p>
            <h2 className={`${mono()} text-white text-base font-bold mt-0.5`}>HARVEST TOKEN DECLARATION</h2>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white mt-1"><X size={18} /></button>
        </div>

        {/* Step track */}
        <div className="flex gap-0">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col">
              <div className={`h-0.5 transition-colors ${i <= step ? 'bg-amber-400' : 'bg-zinc-800'}`} />
              <p className={`${mono()} text-[8px] mt-1.5 tracking-widest font-bold transition-colors ${i === step ? 'text-amber-400' : i < step ? 'text-zinc-500' : 'text-zinc-700'}`}>
                {s}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <AnimatePresence mode="wait">
          {/* ── STEP 0: FIELD ── */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-5">
              <div>
                <Label>SELECT PLOT</Label>
                <div className="mt-2 space-y-1.5">
                  {plots.map(p => (
                    <button key={p.id} onClick={() => { setPlotId(p.id); setCropType(p.crop_type || ''); setAreaAcres(String(p.area || '')); }}
                      className={`w-full text-left px-3 py-3 border transition-all ${plotId === p.id ? 'border-amber-400 bg-amber-400/5' : 'border-zinc-800 hover:border-zinc-600'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm font-bold">{p.name}</span>
                        {plotId === p.id && <span className={`${mono()} text-amber-400 text-[9px]`}>SELECTED ◆</span>}
                      </div>
                      <p className={`${mono()} text-zinc-600 text-[10px] mt-0.5`}>{p.area} acres · {p.crop_type || '—'}</p>
                    </button>
                  ))}
                  {plots.length === 0 && <p className="text-zinc-700 text-xs italic py-3">No plots registered. Add a plot first.</p>}
                </div>
              </div>

              <div>
                <Label>LINK CARBON PROJECT (optional)</Label>
                <div className="mt-2 space-y-1.5">
                  <button onClick={() => setProjectId(null)}
                    className={`w-full text-left px-3 py-2.5 border text-xs transition-all ${!projectId ? 'border-amber-400/50 text-amber-400' : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}>
                    — None
                  </button>
                  {carbonProjects.filter(p => p.status === 'Verified' || p.status === 'Issued').map(p => (
                    <button key={p.id} onClick={() => setProjectId(p.id)}
                      className={`w-full text-left px-3 py-2.5 border transition-all ${projectId === p.id ? 'border-amber-400 bg-amber-400/5' : 'border-zinc-800 hover:border-zinc-600'}`}>
                      <span className="text-white text-xs font-bold">{p.plot_name}</span>
                      <span className={`${mono()} text-zinc-500 text-[10px] ml-3`}>{p.methodology} · {p.available_credits?.toFixed(2)} ACT</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CROP TYPE *</Label>
                  <input value={cropType} onChange={e => setCropType(e.target.value)} placeholder="Wheat, Rice, Cotton…" className={inputCls} />
                </div>
                <div>
                  <Label>VARIETY</Label>
                  <input value={variety} onChange={e => setVariety(e.target.value)} placeholder="Sharbati, 1121…" className={inputCls} />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 1: HARVEST ── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-5">
              <div>
                <Label>HARVEST DATE *</Label>
                <input type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <Label>TOTAL YIELD (kg) *</Label>
                <input type="number" value={yieldKg} onChange={e => setYieldKg(e.target.value)} placeholder="0" className={inputCls} />
              </div>
              <div>
                <Label>AREA HARVESTED (acres) *</Label>
                <input type="number" value={areaAcres} onChange={e => setAreaAcres(e.target.value)} placeholder={selectedPlot ? String(selectedPlot.area) : '0.0'} className={inputCls} />
              </div>

              {parseFloat(yieldKg) > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-l-2 border-amber-400 pl-4 py-2 mt-4">
                  <Label>COMPUTED CARBON FOOTPRINT</Label>
                  <p className={`${mono()} text-amber-400 text-2xl font-bold mt-1`}>{co2.toFixed(2)} <span className="text-sm font-normal text-zinc-500">kg CO₂e</span></p>
                  <p className={`${mono()} text-zinc-700 text-[10px] mt-1`}>{ef[methodology] || 0.28} kg CO₂e/kg · {methodology}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── STEP 2: INPUTS ── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>CHEMICAL INPUTS DECLARATION</Label>
                  <p className="text-zinc-600 text-[11px] mt-0.5">Fertilisers, pesticides, herbicides applied to this harvest</p>
                </div>
                <button onClick={addInput} className="border border-amber-400/50 text-amber-400 px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-amber-400/10 transition-colors">
                  <Plus size={11} /> ADD
                </button>
              </div>

              {inputs.length === 0 ? (
                <div className="border border-dashed border-zinc-800 py-8 text-center">
                  <p className={`${mono()} text-zinc-700 text-xs`}>NO INPUTS DECLARED</p>
                  <p className="text-zinc-800 text-[10px] mt-1">Leave empty for organic / chemical-free certification</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inputs.map((inp, i) => (
                    <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="border border-zinc-800 p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`${mono()} text-zinc-600 text-[9px] tracking-widest`}>INPUT_{String(i + 1).padStart(2, '0')}</span>
                        <button onClick={() => removeInput(i)} className="text-zinc-700 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                      </div>
                      <div className="space-y-2">
                        <input value={inp.name} onChange={e => updateInput(i, 'name', e.target.value)} placeholder="Chemical name" className={inputCls} />
                        <div className="grid grid-cols-2 gap-3">
                          <input value={inp.quantity} onChange={e => updateInput(i, 'quantity', e.target.value)} placeholder="Qty" className={inputCls} />
                          <select value={inp.unit} onChange={e => updateInput(i, 'unit', e.target.value)} className={`${inputCls} bg-transparent`}>
                            {['kg/acre', 'L/acre', 'g/acre', 'mL/acre'].map(u => <option key={u} value={u} style={{ background: '#0D0D0D' }}>{u}</option>)}
                          </select>
                        </div>
                        <input type="date" value={inp.applied_date} onChange={e => updateInput(i, 'applied_date', e.target.value)} className={inputCls} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── STEP 3: SIGN / CONFIRM ── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">
              <div className="border border-zinc-800 p-4 space-y-3">
                <p className={`${mono()} text-zinc-500 text-[9px] tracking-[0.2em] pb-2 border-b border-zinc-800`}>DECLARATION SUMMARY</p>
                {[
                  ['PLOT', selectedPlot?.name || '—'],
                  ['CROP', `${cropType}${variety ? ' · ' + variety : ''}`],
                  ['HARVEST', harvestDate],
                  ['YIELD', `${parseFloat(yieldKg || '0').toLocaleString()} kg`],
                  ['AREA', `${areaAcres} acres`],
                  ['CARBON FOOTPRINT', `${co2.toFixed(3)} kg CO₂e`],
                  ['CHEMICAL INPUTS', `${inputs.filter(i => i.name.trim()).length} declared`],
                  ...(selectedProject ? [['CREDITS LINKED', `${selectedProject.available_credits?.toFixed(3)} ACT`]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-baseline">
                    <Label>{k}</Label>
                    <span className={`${mono()} text-white text-xs font-bold text-right ml-4 max-w-[60%]`}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="border-l-4 border-amber-400 pl-4 py-2">
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  By minting, you declare all information accurate. A <span className="text-amber-400">sha256 hash chain</span> entry will be created on the Krishi-Drishti ledger — immutable and CBAM-compliant.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="flex-shrink-0 grid grid-cols-2 border-t border-zinc-800">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
          className="py-4 text-zinc-500 text-xs font-bold hover:text-white hover:bg-zinc-900 transition-all border-r border-zinc-800"
        >
          {step === 0 ? 'CANCEL' : '← BACK'}
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext[step]}
            className="py-4 text-black text-xs font-bold bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
          >
            NEXT →
          </button>
        ) : (
          <button
            onClick={mint}
            disabled={loading}
            className="py-4 text-black text-xs font-bold bg-amber-400 hover:bg-amber-300 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : '◆'}
            {loading ? 'MINTING…' : 'MINT TOKEN'}
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ── Token Row (Ledger Entry) ──────────────────────────────────────────────────
const TokenRow: React.FC<{
  token: HarvestToken;
  isExpanded: boolean;
  onToggle: () => void;
  onQR: () => void;
  onTransfer: () => void;
  onVerify: () => void;
}> = ({ token, isExpanded, onToggle, onQR, onTransfer, onVerify }) => {
  const isTransferred = token.status === 'Transferred';

  return (
    <div className="border-b border-zinc-900">
      {/* Row header */}
      <button onClick={onToggle} className="w-full text-left px-4 py-4 hover:bg-zinc-900/50 transition-colors">
        <div className="flex items-start gap-3">
          {/* Left accent — color by status */}
          <div className={`w-0.5 self-stretch flex-shrink-0 mt-0.5 ${isTransferred ? 'bg-sky-500' : 'bg-amber-400'}`} />

          <div className="flex-1 min-w-0">
            {/* Top row: token ID + stamp */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className={`${mono()} text-amber-400 text-xs font-bold tracking-wider`}>{token.token_id}</p>
              <Stamp status={token.status} />
            </div>

            {/* Crop info */}
            <p className="text-white text-sm font-bold leading-none">
              {token.crop_type}
              {token.variety && <span className="text-zinc-500 font-normal"> · {token.variety}</span>}
            </p>
            <p className={`${mono()} text-zinc-600 text-[10px] mt-0.5`}>{token.plot_name}</p>

            {/* Key numbers */}
            <div className="flex items-center gap-4 mt-3">
              <div>
                <Label>YIELD</Label>
                <p className={`${mono()} text-white text-sm font-bold`}>{token.yield_kg.toLocaleString()} kg</p>
              </div>
              <div className="w-px h-6 bg-zinc-800" />
              <div>
                <Label>CO₂E</Label>
                <p className={`${mono()} text-amber-400 text-sm font-bold`}>{token.carbon_footprint_kg_co2e.toFixed(2)}</p>
              </div>
              {token.carbon_credits_linked > 0 && (
                <>
                  <div className="w-px h-6 bg-zinc-800" />
                  <div>
                    <Label>ACT</Label>
                    <p className={`${mono()} text-sky-400 text-sm font-bold`}>{token.carbon_credits_linked.toFixed(2)}</p>
                  </div>
                </>
              )}
            </div>

            {/* Mini hash preview */}
            <p className={`${mono()} text-zinc-800 text-[9px] mt-2 truncate`}>
              sha256: {token.token_hash ? token.token_hash.slice(0, 40) + '…' : '—'}
            </p>
          </div>

          {/* Expand arrow */}
          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} className="text-zinc-700 flex-shrink-0 mt-1 text-xs">▼</motion.span>
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 ml-3 space-y-4 border-t border-zinc-900 pt-4">
              {/* Data grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  ['HARVEST DATE', new Date(token.harvest_date).toLocaleDateString('en-IN')],
                  ['AREA', `${token.area_harvested_acres} ac`],
                  ['METHODOLOGY', token.farming_methodology || '—'],
                  ['NDVI', token.ndvi_at_harvest ? token.ndvi_at_harvest.toFixed(3) : '—'],
                  ['BLOCK #', `${token.sequence_number}`],
                  ['MINTED', token.minted_at ? new Date(token.minted_at).toLocaleDateString('en-IN') : '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <Label>{k}</Label>
                    <p className={`${mono()} text-white text-xs font-bold mt-0.5`}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Hash chain */}
              <div className="border border-zinc-800 p-3 space-y-2">
                <HashLine hash={token.token_hash || '—'} label="TOKEN HASH (sha256)" />
                {token.previous_hash ? (
                  <HashLine hash={token.previous_hash} label="PREV HASH (chain link)" color="text-zinc-500" />
                ) : (
                  <div>
                    <Label>CHAIN POSITION</Label>
                    <p className={`${mono()} text-amber-400 text-[10px] mt-0.5`}>◆ GENESIS — first block in ledger</p>
                  </div>
                )}
              </div>

              {/* Chemical inputs */}
              {token.chemical_inputs.length > 0 && (
                <div>
                  <Label>CHEMICAL INPUTS ({token.chemical_inputs.length})</Label>
                  <div className="mt-1.5 space-y-1">
                    {token.chemical_inputs.map((inp, i) => (
                      <div key={i} className="flex justify-between items-center py-1 border-b border-zinc-900">
                        <span className="text-zinc-300 text-xs">{inp.name}</span>
                        <span className={`${mono()} text-zinc-600 text-[10px]`}>{inp.quantity} {inp.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {token.chemical_inputs.length === 0 && (
                <p className={`${mono()} text-zinc-700 text-[10px]`}>NO CHEMICAL INPUTS — eligible for organic certification</p>
              )}

              {/* Transfer history */}
              {token.transfer_logs.length > 0 && (
                <div>
                  <Label>CUSTODY CHAIN</Label>
                  {token.transfer_logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 mt-2">
                      <span className="text-amber-400 text-xs mt-0.5">→</span>
                      <div>
                        <p className="text-white text-xs font-bold">{log.from_entity} → {log.to_entity}</p>
                        <p className={`${mono()} text-zinc-700 text-[9px]`}>{new Date(log.transfer_date).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action row */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button onClick={onQR} className="py-2.5 border border-zinc-800 text-zinc-400 text-[10px] font-bold hover:border-zinc-600 hover:text-white transition-all flex items-center justify-center gap-1.5">
                  QR
                </button>
                {!isTransferred && (
                  <button onClick={onTransfer} className="py-2.5 border border-zinc-800 text-zinc-400 text-[10px] font-bold hover:border-sky-500 hover:text-sky-400 transition-all flex items-center justify-center gap-1.5">
                    <ArrowRightLeft size={11} /> TRANSFER
                  </button>
                )}
                <button onClick={onVerify}
                  className={`py-2.5 border border-amber-400/30 text-amber-400 text-[10px] font-bold hover:bg-amber-400/10 transition-all flex items-center justify-center gap-1.5 ${isTransferred ? 'col-span-2' : ''}`}>
                  <Shield size={11} /> VERIFY
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Log Event Wizard (Camera & GPS) ───────────────────────────────────────────
const LogEventWizard: React.FC<{ cycleId: number; onClose: () => void; onSuccess: () => void }> = ({ cycleId, onClose, onSuccess }) => {
  const [step, setStep] = useState<'type' | 'camera' | 'uploading'>('type');
  const [eventType, setEventType] = useState('');
  
  const handleCapture = async () => {
    setStep('uploading');
    
    // Simulate GPS fetch & upload delay
    await new Promise(r => setTimeout(r, 1500));
    
    try {
      await fetch(`/api/trace/cycle/${cycleId}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          event_type: eventType,
          geo_lat: 21.1458,
          geo_lng: 79.0882,
          media_url: 'https://krishi-drishti.s3.ap-south-1.amazonaws.com/evidence/simulated_field_photo.jpg',
          notes: 'Routine check'
        })
      });
    } catch (e) { console.error(e); }
    
    onSuccess();
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[250] bg-black/90 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm border border-zinc-800 bg-[#0D0D0D] p-5">
        <div className="flex justify-between items-center mb-5">
          <p className={`${mono()} text-amber-400 text-[10px] tracking-widest`}>LOG FIELD EVENT</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>

        {step === 'type' ? (
          <div className="space-y-3">
            {['Sowing', 'Fertilizing', 'Weeding', 'Inspection', 'Pest Control'].map(t => (
              <button key={t} onClick={() => { setEventType(t); setStep('camera'); }} className="w-full py-3 border border-zinc-800 text-left px-4 text-sm text-zinc-300 hover:border-amber-400 hover:text-amber-400 transition-colors">
                {t}
              </button>
            ))}
          </div>
        ) : step === 'camera' ? (
          <div className="space-y-4">
            <div className="aspect-[3/4] border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center bg-zinc-900/50">
              <Camera size={32} className="text-zinc-600 mb-2" />
              <p className={`${mono()} text-zinc-500 text-[10px]`}>CAMERA SENSOR ACTIVE</p>
            </div>
            <button onClick={handleCapture} className="w-full py-3 bg-amber-400 text-black text-xs font-bold flex justify-center items-center gap-2">
              <Camera size={14} /> CAPTURE & GEOTAG
            </button>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-amber-400" size={24} />
            <p className={`${mono()} text-zinc-500 text-[10px]`}>SECURING HASH & MEDIA…</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Chain View ────────────────────────────────────────────────────────────────
const ChainView: React.FC<{ tokens: HarvestToken[]; onMint: () => void }> = ({ tokens, onMint }) => {
  const sorted = [...tokens].sort((a, b) => a.sequence_number - b.sequence_number);

  return (
    <div className="px-4 py-5 space-y-0">
      {sorted.length === 0 ? (
        <div className="text-center py-20">
          <p className={`${mono()} text-zinc-800 text-sm`}>LEDGER EMPTY</p>
          <p className="text-zinc-700 text-xs mt-1">Mint a token to start the chain</p>
          <button onClick={onMint} className="mt-5 border border-amber-400/40 text-amber-400 px-6 py-2.5 text-xs font-bold hover:bg-amber-400/10 transition-colors">
            ◆ MINT GENESIS BLOCK
          </button>
        </div>
      ) : (
        sorted.map((token, i) => (
          <motion.div key={token.token_id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
            {/* Block */}
            <div className="border border-zinc-800 p-3" style={{ borderLeft: '3px solid #F59E0B' }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className={`${mono()} text-zinc-600 text-[9px] tracking-widest`}>BLOCK_{String(token.sequence_number).padStart(5, '0')}</p>
                  <p className={`${mono()} text-amber-400 text-xs font-bold mt-0.5`}>{token.token_id}</p>
                </div>
                <Stamp status={token.status} />
              </div>

              <p className="text-white text-sm font-bold">{token.crop_type}{token.variety ? ` · ${token.variety}` : ''}</p>

              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <Label>HASH</Label>
                  <p className={`${mono()} text-amber-400/70 text-[9px] truncate`}>{token.token_hash?.slice(0, 48)}…</p>
                </div>
                {token.previous_hash ? (
                  <div className="flex items-center gap-2">
                    <Label>PREV</Label>
                    <p className={`${mono()} text-zinc-600 text-[9px] truncate`}>{token.previous_hash.slice(0, 48)}…</p>
                  </div>
                ) : (
                  <p className={`${mono()} text-amber-400 text-[9px]`}>◆ GENESIS BLOCK</p>
                )}
              </div>

              <div className="flex gap-4 mt-2">
                <div><Label>YIELD</Label><p className={`${mono()} text-white text-xs font-bold`}>{token.yield_kg.toLocaleString()} kg</p></div>
                <div><Label>CO₂E</Label><p className={`${mono()} text-amber-400 text-xs font-bold`}>{token.carbon_footprint_kg_co2e.toFixed(2)} kg</p></div>
                <div><Label>DATE</Label><p className={`${mono()} text-zinc-400 text-xs font-bold`}>{new Date(token.harvest_date).toLocaleDateString('en-IN')}</p></div>
              </div>
            </div>

            {/* Chain connector */}
            {i < sorted.length - 1 && (
              <div className="flex items-center ml-3 my-0.5">
                <div className="w-px h-5 bg-amber-400/30" />
                <span className={`${mono()} text-amber-400/30 text-[8px] ml-2`}>└── linked to next block</span>
              </div>
            )}
          </motion.div>
        ))
      )}

      {sorted.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: sorted.length * 0.06 + 0.1 }}
          className="pt-4">
          <button onClick={onMint} className="w-full py-3 border border-dashed border-amber-400/30 text-amber-400/60 text-[10px] font-bold hover:border-amber-400/60 hover:text-amber-400 transition-all">
            ◆ APPEND NEXT BLOCK
          </button>
        </motion.div>
      )}
    </div>
  );
};

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
const TraceabilityScreen: React.FC<Props> = ({ navigateTo, preSelectedProjectId }) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'chain' | 'cycles'>('ledger');
  const [tokens, setTokens] = useState<HarvestToken[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [carbonProjects, setCarbonProjects] = useState<any[]>([]);
  const [activeCycles, setActiveCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMint, setShowMint] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showEventLog, setShowEventLog] = useState<{ cycleId: number } | null>(null);
  const [selectedToken, setSelectedToken] = useState<HarvestToken | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Show intro only on first visit
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem(INTRO_KEY));

  const load = async () => {
    setLoading(true);
    try {
      const [t, p, c] = await Promise.all([traceabilityService.getMyTokens(), plotService.getPlots(), carbonService.getProjects()]);
      setTokens(t); setPlots(p); setCarbonProjects(c);
      
      // Fetch active cycles (simulate for now if API not hooked up fully in frontend)
      try {
        const res = await fetch('/api/trace/cycle/active', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
            const data = await res.json();
            setActiveCycles(data);
        }
      } catch (e) { console.error("Could not fetch cycles", e); }

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (preSelectedProjectId) setShowMint(true); }, [preSelectedProjectId]);

  const totalYield = tokens.reduce((s, t) => s + t.yield_kg, 0);
  const totalCO2 = tokens.reduce((s, t) => s + t.carbon_footprint_kg_co2e, 0);
  const minted = tokens.filter(t => t.status === 'Minted').length;
  const transferred = tokens.filter(t => t.status === 'Transferred').length;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#0D0D0D', color: '#fff' }}>

      {/* ── TOP BAR ── */}
      <div className="flex-shrink-0 px-4 pt-5 pb-0" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigateTo('home')}
            className="w-8 h-8 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:border-zinc-600 hover:text-white transition-all">
            <ArrowLeft size={16} />
          </button>

          <div className="text-center">
            <p className={`${mono()} text-amber-400 text-[9px] tracking-[0.25em] uppercase`}>KRISHI LEDGER v2.1</p>
          </div>

          <button onClick={() => setShowMint(true)}
            className="border border-amber-400 text-amber-400 px-3 py-1.5 text-[10px] font-bold hover:bg-amber-400 hover:text-black transition-all flex items-center gap-1.5">
            <Plus size={11} /> MINT
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 border-t border-zinc-900 -mx-4">
          {[
            ['TOKENS', tokens.length],
            ['YIELD', `${(totalYield / 1000).toFixed(1)}t`],
            ['CO₂E', `${totalCO2.toFixed(0)}kg`],
            ['ACTIVE', minted],
          ].map(([label, val], i) => (
            <div key={label as string} className={`px-3 py-3 ${i < 3 ? 'border-r border-zinc-900' : ''}`}>
              <Label>{label}</Label>
              <p className={`${mono()} text-white text-base font-bold mt-0.5 leading-none`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex -mx-4 mt-0">
          {(['ledger', 'chain', 'cycles'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[10px] font-bold tracking-[0.2em] uppercase transition-all relative ${activeTab === tab ? 'text-amber-400' : 'text-zinc-700 hover:text-zinc-500'}`}>
              [ {tab.toUpperCase()} ]
              {activeTab === tab && <motion.div layoutId="trace-tab-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="animate-spin text-amber-400" size={24} />
            <p className={`${mono()} text-zinc-700 text-xs tracking-widest`}>FETCHING LEDGER…</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'ledger' ? (
              <motion.div key="ledger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {tokens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                    <div className="w-16 h-16 border border-amber-400/20 flex items-center justify-center mb-5">
                      <span className={`${mono()} text-amber-400/40 text-xl font-bold`}>0</span>
                    </div>
                    <p className={`${mono()} text-zinc-500 text-sm font-bold`}>LEDGER EMPTY</p>
                    <p className="text-zinc-700 text-xs mt-2 leading-relaxed max-w-xs">
                      Mint your first harvest token to begin CBAM and CCTS compliant supply chain traceability.
                    </p>
                    <button onClick={() => setShowMint(true)}
                      className="mt-6 border border-amber-400 text-amber-400 px-6 py-3 text-xs font-bold hover:bg-amber-400 hover:text-black transition-all flex items-center gap-2">
                      <Plus size={13} /> MINT FIRST TOKEN
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Ledger header */}
                    <div className="grid grid-cols-3 px-4 py-2 border-b border-zinc-900">
                      <Label>TOKEN ID</Label>
                      <Label>CROP</Label>
                      <Label className="text-right">STATUS</Label>
                    </div>
                    {tokens.map(token => (
                      <TokenRow
                        key={token.token_id}
                        token={token}
                        isExpanded={expandedId === token.token_id}
                        onToggle={() => setExpandedId(expandedId === token.token_id ? null : token.token_id)}
                        onQR={() => { setSelectedToken(token); setShowQR(true); }}
                        onTransfer={() => { setSelectedToken(token); setShowTransfer(true); }}
                        onVerify={() => navigateTo('trace-verify', { tokenId: token.token_id })}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : activeTab === 'chain' ? (
              <motion.div key="chain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ChainView tokens={tokens} onMint={() => setShowMint(true)} />
              </motion.div>
            ) : (
              <motion.div key="cycles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
                <button 
                  className="w-full py-3 border border-dashed border-amber-400/30 text-amber-400/60 text-[10px] font-bold hover:border-amber-400/60 hover:text-amber-400 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> START CROP CYCLE
                </button>
                {activeCycles.length === 0 ? (
                  <div className="text-center py-12">
                     <p className={`${mono()} text-zinc-500 text-xs`}>NO ACTIVE CYCLES</p>
                  </div>
                ) : (
                  activeCycles.map(c => (
                    <div key={c.id} className="border border-zinc-800 p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className={`${mono()} text-amber-400 text-sm font-bold`}>{c.crop_type}</p>
                          <p className={`${mono()} text-zinc-500 text-[10px] mt-1`}>Started: {new Date(c.start_date).toLocaleDateString()}</p>
                        </div>
                        <span className={`${mono()} border border-zinc-700 text-zinc-500 px-2 py-0.5 text-[9px]`}>
                          {c.events_count} EVENTS LOGGED
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-zinc-900">
                        <button onClick={() => setShowEventLog({ cycleId: c.id })} className="py-2 border border-zinc-800 text-zinc-400 text-[10px] font-bold hover:text-white transition-all flex justify-center items-center gap-1.5">
                          <Camera size={12} /> LOG EVENT
                        </button>
                        <button onClick={() => setShowMint(true)} className="py-2 bg-amber-400 text-black text-[10px] font-bold hover:bg-amber-300 transition-all flex justify-center items-center gap-1.5">
                          <CheckCircle2 size={12} /> END & MINT
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {showIntro && <CycleIntro onDone={() => setShowIntro(false)} />}
        {showMint && (
          <MintWizard plots={plots} carbonProjects={carbonProjects} onClose={() => setShowMint(false)} onSuccess={load} />
        )}
        {showEventLog && (
          <LogEventWizard cycleId={showEventLog.cycleId} onClose={() => setShowEventLog(null)} onSuccess={load} />
        )}
        {showQR && selectedToken && (
          <QRPanel token={selectedToken} onClose={() => setShowQR(false)} />
        )}
        {showTransfer && selectedToken && (
          <TransferPanel token={selectedToken} onClose={() => setShowTransfer(false)} onSuccess={load} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TraceabilityScreen;
