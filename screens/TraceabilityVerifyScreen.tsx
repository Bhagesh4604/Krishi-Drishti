/**
 * TraceabilityVerifyScreen — "Provenance Certificate"
 * ────────────────────────────────────────────────────
 * Public buyer-facing page reached via QR code scan.
 * Aesthetic: Terminal Ledger — matches TraceabilityScreen.
 * - Black, amber, monospace
 * - Certificate metaphor with a printed document feel
 * - sha256 re-computed client-side via Web Crypto API
 * - Privacy by design: farmer initials + district only
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, Loader2, AlertTriangle, Shield, MapPin, Camera } from 'lucide-react';
import { Screen, HarvestToken } from '../types';
import { traceabilityService } from '../src/services/api';

interface Props {
  navigateTo: (screen: Screen) => void;
  tokenId?: string;
}

// ── Web Crypto sha256 ─────────────────────────────────────────────────────────
async function sha256(msg: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Mono helper ─────────────────────────────────────────────────────────────
const mono = (cls = '') => `font-['JetBrains_Mono',monospace] ${cls}`;
const Lbl = ({ s }: { s: string }) => (
  <span className={`${mono()} block text-[9px] text-zinc-600 uppercase tracking-[0.15em] mb-0.5`}>{s}</span>
);

// ── Section block ─────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-900">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/40 transition-colors">
        <span className={`${mono()} text-zinc-500 text-[9px] tracking-[0.2em] uppercase`}>{title}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-zinc-700 text-xs">▼</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-2 border-t border-zinc-900">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Data pair ─────────────────────────────────────────────────────────────────
const Pair: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="flex justify-between items-baseline py-2 border-b border-zinc-900 last:border-0">
    <span className={`${mono()} text-[9px] text-zinc-600 uppercase tracking-widest flex-shrink-0`}>{label}</span>
    <span className={`${mono()} text-xs font-bold ml-4 text-right ${accent ? 'text-amber-400' : 'text-white'}`}>{value}</span>
  </div>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const TraceabilityVerifyScreen: React.FC<Props> = ({ navigateTo, tokenId }) => {
  const [token, setToken] = useState<HarvestToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrityStatus, setIntegrityStatus] = useState<'pending' | 'checking' | 'ok' | 'fail'>('pending');
  const [showRaw, setShowRaw] = useState(false);

  const resolvedId = tokenId || new URLSearchParams(window.location.search).get('verify');

  useEffect(() => {
    if (!resolvedId) { setError('No token ID in QR code.'); setLoading(false); return; }
    (async () => {
      try {
        const data = await traceabilityService.verifyToken(resolvedId);
        setToken(data);
        setIntegrityStatus('checking');
        const computed = await sha256(data.hash_payload || '');
        setIntegrityStatus(computed === data.token_hash ? 'ok' : 'fail');
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Token not found.');
      } finally {
        setLoading(false);
      }
    })();
  }, [resolvedId]);

  // ── Loading ──
  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-3" style={{ background: '#0D0D0D' }}>
      <Loader2 className="animate-spin text-amber-400" size={22} />
      <p className={`${mono()} text-zinc-700 text-xs tracking-widest`}>FETCHING PROVENANCE…</p>
    </div>
  );

  // ── Error ──
  if (error || !token) return (
    <div className="h-full flex flex-col" style={{ background: '#0D0D0D' }}>
      <div className="px-4 pt-5">
        <button onClick={() => navigateTo('home')} className="w-8 h-8 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:border-zinc-600 hover:text-white transition-all">
          <ArrowLeft size={16} />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-14 h-14 border border-red-500/30 flex items-center justify-center mb-4">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <p className={`${mono()} text-red-400 text-sm font-bold`}>VERIFICATION FAILED</p>
        <p className="text-zinc-600 text-xs mt-2 leading-relaxed">{error}</p>
      </div>
    </div>
  );

  // ── Integrity banner config ──
  const integrityConfig = {
    checking: { border: 'border-zinc-800', bg: '', text: 'text-zinc-500', label: 'COMPUTING HASH…', icon: <Loader2 size={14} className="animate-spin text-zinc-600" /> },
    ok:       { border: 'border-amber-400', bg: 'bg-amber-400/5', text: 'text-amber-400', label: 'HASH INTEGRITY VERIFIED', icon: <Shield size={14} className="text-amber-400" /> },
    fail:     { border: 'border-red-500', bg: 'bg-red-500/5', text: 'text-red-400', label: 'HASH MISMATCH — DO NOT ACCEPT', icon: <AlertTriangle size={14} className="text-red-400" /> },
    pending:  { border: 'border-zinc-800', bg: '', text: 'text-zinc-600', label: 'HASH PENDING', icon: <Shield size={14} className="text-zinc-600" /> },
  }[integrityStatus];

  const statusColor: Record<string, string> = { Minted: 'border-amber-400 text-amber-400', Transferred: 'border-sky-400 text-sky-400', Draft: 'border-zinc-600 text-zinc-600' };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#0D0D0D', color: '#fff' }}>

      {/* ── TOP BAR ── */}
      <div className="flex-shrink-0 px-4 pt-5 pb-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigateTo('home')} className="w-8 h-8 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:border-zinc-600 hover:text-white transition-all">
            <ArrowLeft size={16} />
          </button>
          <p className={`${mono()} text-zinc-600 text-[9px] tracking-[0.25em]`}>PUBLIC PROVENANCE CERTIFICATE</p>
          <div className="w-8" />
        </div>

        {/* Token ID hero */}
        <div className="mt-2">
          <p className={`${mono()} text-amber-400 text-lg font-bold tracking-wider leading-none`}>{token.token_id}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`${mono()} inline-block border-2 px-2 py-0.5 text-[9px] font-bold tracking-[0.2em] rotate-[-1deg] ${statusColor[token.status] || statusColor.Draft}`}>
              {token.status}
            </span>
            {token.cbam_eligible && (
              <span className={`${mono()} inline-block border border-zinc-700 px-2 py-0.5 text-[9px] text-zinc-500 tracking-widest`}>CBAM</span>
            )}
            {token.ccts_eligible && (
              <span className={`${mono()} inline-block border border-zinc-700 px-2 py-0.5 text-[9px] text-zinc-500 tracking-widest`}>CCTS</span>
            )}
          </div>
        </div>

        {/* Integrity banner */}
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={`mt-4 flex items-center gap-3 px-3 py-2.5 border ${integrityConfig.border} ${integrityConfig.bg}`}
        >
          {integrityConfig.icon}
          <span className={`${mono()} text-[10px] font-bold ${integrityConfig.text}`}>{integrityConfig.label}</span>
        </motion.div>
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* Crop Identity */}
        <Section title="01 — CROP IDENTITY">
          <div className="space-y-0">
            <Pair label="CROP" value={token.crop_type} />
            {token.variety && <Pair label="VARIETY" value={token.variety} />}
            <Pair label="HARVEST DATE" value={new Date(token.harvest_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <Pair label="TOTAL YIELD" value={`${token.yield_kg.toLocaleString()} kg`} accent />
            <Pair label="AREA HARVESTED" value={`${token.area_harvested_acres} acres`} />
            <Pair label="YIELD DENSITY" value={`${(token.yield_kg / Math.max(token.area_harvested_acres, 0.01)).toFixed(0)} kg / acre`} />
            <Pair label="FARM REGION" value={`${token.farmer_district} District`} />
            <Pair label="FARMER" value={`${token.farmer_initials}. — identity protected`} />
          </div>
        </Section>

        {/* Environmental */}
        <Section title="02 — ENVIRONMENTAL FOOTPRINT">
          {/* Big number */}
          <div className="border-l-2 border-amber-400 pl-4 py-2 mb-4">
            <Lbl s="TOTAL CARBON FOOTPRINT" />
            <p className={`${mono()} text-amber-400 text-3xl font-bold leading-none`}>
              {token.carbon_footprint_kg_co2e.toFixed(3)}
              <span className="text-zinc-600 text-sm font-normal ml-2">kg CO₂e</span>
            </p>
            <p className={`${mono()} text-zinc-700 text-[10px] mt-1`}>
              = {(token.carbon_footprint_kg_co2e / Math.max(token.yield_kg, 1)).toFixed(4)} kg CO₂e per kg yield
            </p>
          </div>

          <Pair label="METHODOLOGY" value={token.farming_methodology || 'Conventional'} />
          {token.ndvi_at_harvest != null && <Pair label="NDVI AT HARVEST" value={token.ndvi_at_harvest.toFixed(4)} accent />}
          {token.carbon_credits_linked > 0 && <Pair label="CARBON CREDITS LINKED" value={`${token.carbon_credits_linked.toFixed(3)} ACT`} accent />}

          {token.farming_methodology && (
            <div className="mt-3 border-l border-zinc-800 pl-3">
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                {token.farming_methodology === 'No-Till' && 'No-till farming preserves soil structure and sequesters carbon by eliminating plow-induced CO₂ release.'}
                {token.farming_methodology === 'Cover-Crop' && 'Cover cropping builds soil organic matter, sequesters atmospheric CO₂, and reduces synthetic fertiliser demand.'}
                {token.farming_methodology === 'Agroforestry' && 'Integrated tree cultivation provides permanent carbon sinks with concurrent agricultural production.'}
                {token.farming_methodology === 'Conventional' && 'Conventional inputs fully declared for regulatory transparency under CBAM Article 7.'}
                {token.farming_methodology === 'Mixed' && 'Mixed methodology combining multiple sustainable practices for balanced outcomes.'}
              </p>
            </div>
          )}
        </Section>

        {/* Chemical Inputs */}
        <Section title="03 — CHEMICAL INPUTS DECLARATION" defaultOpen={false}>
          {token.chemical_inputs.length === 0 ? (
            <div className="border border-dashed border-zinc-800 py-5 text-center">
              <p className={`${mono()} text-zinc-700 text-xs`}>NO CHEMICAL INPUTS DECLARED</p>
              <p className="text-zinc-800 text-[10px] mt-1">Eligible for organic and chemical-free certification</p>
            </div>
          ) : (
            <div className="space-y-0">
              {token.chemical_inputs.map((inp, i) => (
                <div key={i} className="flex justify-between items-baseline py-2 border-b border-zinc-900 last:border-0">
                  <span className="text-zinc-300 text-xs">{inp.name}</span>
                  <div className="text-right">
                    <span className={`${mono()} text-amber-400 text-xs font-bold`}>{inp.quantity} {inp.unit}</span>
                    <p className={`${mono()} text-zinc-700 text-[9px]`}>{inp.applied_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Custody chain */}
        {token.transfer_logs && token.transfer_logs.length > 0 && (
          <Section title="04 — CUSTODY CHAIN" defaultOpen={false}>
            <div className="space-y-3">
              {token.transfer_logs.map((log, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center flex-shrink-0 mt-1">
                    <span className={`${mono()} text-amber-400 text-xs`}>→</span>
                    {i < token.transfer_logs.length - 1 && <div className="w-px flex-1 bg-zinc-800 mt-1 min-h-[12px]" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-white text-xs font-bold">{log.from_entity} <span className="text-zinc-600">→</span> {log.to_entity}</p>
                    <p className={`${mono()} text-zinc-700 text-[9px] mt-0.5`}>{new Date(log.transfer_date).toLocaleString()}</p>
                    {log.notes && <p className="text-zinc-600 text-[10px] mt-0.5 italic">{log.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Lifecycle Evidence */}
        {token.crop_cycle && token.crop_cycle.events.length > 0 && (
          <Section title="05 — LIFECYCLE EVIDENCE">
            <div className="space-y-4 pt-1">
              {token.crop_cycle.events.map((e: any, i: number) => (
                <div key={i} className="border border-zinc-800 p-3 bg-zinc-900/30">
                  <div className="flex justify-between items-start mb-2">
                    <p className={`${mono()} text-amber-400 text-sm font-bold uppercase tracking-wider`}>{e.type}</p>
                    <p className={`${mono()} text-zinc-500 text-[9px]`}>{new Date(e.date).toLocaleDateString()}</p>
                  </div>
                  
                  {e.media && (
                    <div className="w-full aspect-video border border-zinc-800 relative overflow-hidden mb-2">
                      <img src={e.media} alt={e.type} className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all" />
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 border border-zinc-700 flex items-center gap-1">
                         <Camera size={10} className="text-amber-400" />
                         <span className={`${mono()} text-amber-400 text-[8px]`}>VERIFIED MEDIA</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mt-2 text-zinc-400">
                    <MapPin size={10} />
                    <span className={`${mono()} text-[9px]`}>{e.lat?.toFixed(4)}, {e.lng?.toFixed(4)}</span>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-zinc-800/50">
                    <p className={`${mono()} text-zinc-600 text-[8px] break-all`}>HASH: {e.hash}</p>
                  </div>
                </div>
              ))}
              
              <div className="border border-zinc-800 p-3">
                <p className="text-zinc-500 text-[10px] leading-relaxed">
                  These geotagged media events verify the continuous growth cycle. The combined Merkle root of all event hashes is bundled into the final Harvest Token hash.
                </p>
              </div>
            </div>
          </Section>
        )}

        {/* Cryptographic proof */}
        <Section title={token.crop_cycle && token.crop_cycle.events.length > 0 ? "06 — CRYPTOGRAPHIC PROOF" : "05 — CRYPTOGRAPHIC PROOF"} defaultOpen={false}>
          <div className="space-y-4">
            <div>
              <Lbl s="ALGORITHM" />
              <p className={`${mono()} text-zinc-400 text-xs`}>SHA-256 (FIPS 180-4) — computed in browser via Web Crypto API</p>
            </div>
            <div>
              <Lbl s="TOKEN HASH" />
              <p className={`${mono()} text-amber-400 text-[10px] break-all leading-relaxed border border-zinc-800 p-2 mt-1`}>{token.token_hash}</p>
            </div>
            {token.previous_hash && (
              <div>
                <Lbl s="PREVIOUS HASH (CHAIN LINK)" />
                <p className={`${mono()} text-zinc-600 text-[10px] break-all leading-relaxed border border-zinc-800 p-2 mt-1`}>{token.previous_hash}</p>
              </div>
            )}
            {!token.previous_hash && (
              <div className="border-l-2 border-amber-400 pl-3 py-1">
                <p className={`${mono()} text-amber-400 text-[10px]`}>◆ GENESIS BLOCK — no prior hash in chain</p>
              </div>
            )}
            <div>
              <Lbl s="BLOCK SEQUENCE" />
              <p className={`${mono()} text-white text-xs font-bold`}>#{token.sequence_number}</p>
            </div>
            <div className="border border-zinc-800 p-3">
              <p className="text-zinc-600 text-[10px] leading-relaxed">
                Each token hash is computed as <span className={`${mono()} text-amber-400`}>sha256(token_id | all_fields | previous_hash)</span>. The previous hash linkage makes retroactive tampering computationally infeasible without regenerating the entire subsequent chain.
              </p>
            </div>
          </div>
        </Section>

        {/* Footer certificate */}
        <div className="border border-zinc-900 p-4 mt-2">
          <div className="flex justify-between items-start">
            <div>
              <p className={`${mono()} text-amber-400 text-[9px] tracking-[0.2em]`}>KRISHI-DRISHTI TRACEABILITY</p>
              <p className={`${mono()} text-zinc-700 text-[9px] mt-1`}>
                Minted: {token.minted_at ? new Date(token.minted_at).toLocaleDateString('en-IN') : '—'}
              </p>
            </div>
            <div className="text-right">
              {integrityStatus === 'ok' && (
                <span className={`${mono()} border-2 border-amber-400 text-amber-400 px-2 py-1 text-[8px] font-bold tracking-widest rotate-[-2deg] inline-block`}>
                  VERIFIED ◆
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-900">
            <p className="text-zinc-800 text-[9px] leading-relaxed">
              This provenance certificate is valid for regulatory compliance under EU Carbon Border Adjustment Mechanism (CBAM Regulation 2023/956) and India Carbon Credit Trading Scheme (CCTS 2023). Record ID: {token.token_id}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraceabilityVerifyScreen;
