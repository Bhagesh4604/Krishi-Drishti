/**
 * CorporateDashboardScreen — Multi-Farmer / Corporate Bird's Eye View
 * ═══════════════════════════════════════════════════════════════════════
 * From the transcript: "Managing large corporations is really useful — suppose
 * a corporation handles 100 farmers, the dashboard will show a complete
 * overview, like a bird's eye view, of your farmers and your corporation."
 *
 * Also: "The sugarcane industry has no clue about the amount of sugarcane
 * they'll actually get this year. With our platform you can forecast the
 * supply amount you're going to receive."
 *
 * Features:
 * ─────────
 * • Bird's eye grid view of all registered farmers
 * • Per-farmer health score tile with NDVI legend color
 * • Aggregate supply chain forecast
 * • Sorted/filtered by health, crop, region
 * • Supply estimation for agri-processors (mills, factories)
 * • One-tap drill-down into individual farmer field
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, TrendingUp, Leaf, Droplets,
  BarChart3, AlertTriangle, CheckCircle2, ChevronRight,
  Satellite, MapPin, Filter, Search, Layers,
  Building2, Package, Factory, ArrowUpRight, Loader2
} from 'lucide-react';
import { Screen } from '../types';
import { corporateService } from '../src/services/api';

interface Props {
  navigateTo: (screen: Screen, data?: any) => void;
  t?: any;
}

// ── AG5X Health Legend ──────────────────────────────────────────────────────
const HEALTH_LEVELS = [
  { min: 0,    max: 0.2,  label: 'Poor',      color: '#ef4444', bg: '#2d0a0a', text: '#f87171' },
  { min: 0.2,  max: 0.4,  label: 'Low',       color: '#f97316', bg: '#2d1500', text: '#fb923c' },
  { min: 0.4,  max: 0.6,  label: 'Moderate',  color: '#eab308', bg: '#2a2000', text: '#facc15' },
  { min: 0.6,  max: 0.75, label: 'Good',      color: '#84cc16', bg: '#1a2a00', text: '#a3e635' },
  { min: 0.75, max: 1,    label: 'Excellent', color: '#22c55e', bg: '#0a2a12', text: '#4ade80' },
];
function getLevel(ndvi: number) {
  return HEALTH_LEVELS.find(l => ndvi >= l.min && ndvi < l.max) ?? HEALTH_LEVELS[4];
}

// MOCK_FARMERS array removed - we now fetch from backend

// ── Farmer Health Tile ──────────────────────────────────────────────────────
const FarmerTile: React.FC<{
  farmer: any;
  onClick: () => void;
}> = ({ farmer, onClick }) => {
  const lvl = getLevel(farmer.ndvi);
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative rounded-xl p-3 text-left overflow-hidden transition-all"
      style={{ background: lvl.bg, border: `1px solid ${lvl.color}30` }}
    >
      {/* Alert badge */}
      {farmer.hasAlert && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
          <span className="text-[8px] text-white font-black">!</span>
        </div>
      )}

      {/* NDVI big number */}
      <div className="flex items-center justify-between mb-2">
        <div className="w-2 h-2 rounded-full" style={{ background: lvl.color, boxShadow: `0 0 6px ${lvl.color}80` }} />
        <span className="text-[8px] font-bold" style={{ color: lvl.text }}>{lvl.label.toUpperCase()}</span>
      </div>

      <p className="text-xl font-black leading-none" style={{ color: lvl.color }}>
        {(farmer.ndvi * 100).toFixed(0)}
      </p>
      <p className="text-[8px] text-gray-600 mb-2">NDVI</p>

      <p className="text-[10px] text-white font-bold truncate">{farmer.name}</p>
      <p className="text-[9px] text-gray-600 truncate">{farmer.crop} · {farmer.area} ac</p>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[9px] text-gray-600">{farmer.daysToHarvest}d harvest</span>
        <span className="text-[9px] text-blue-400">{farmer.lastSatelliteScan}</span>
      </div>
    </motion.button>
  );
};

// ── Main Screen ─────────────────────────────────────────────────────────────
const CorporateDashboardScreen: React.FC<Props> = ({ navigateTo }) => {
  const [filterCrop, setFilterCrop] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'health' | 'yield' | 'harvest'>('health');
  const [searchQ, setSearchQ] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'supply'>('overview');
  const [farmersList, setFarmersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const data = await corporateService.getPortfolio();
        if (data && data.portfolio) {
          setFarmersList(data.portfolio);
        }
      } catch (e) {
        console.error("Failed to fetch corporate portfolio:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  const crops = useMemo(() => ['All', ...Array.from(new Set(farmersList.map(f => f.crop)))], [farmersList]);

  const filtered = useMemo(() => {
    let arr = farmersList.filter(f =>
      (filterCrop === 'All' || f.crop === filterCrop) &&
      (searchQ === '' || f.name.toLowerCase().includes(searchQ.toLowerCase()) || f.farmName.toLowerCase().includes(searchQ.toLowerCase()))
    );
    if (sortBy === 'health') arr = arr.sort((a, b) => b.ndvi - a.ndvi);
    if (sortBy === 'yield') arr = arr.sort((a, b) => b.estimatedYieldTons - a.estimatedYieldTons);
    if (sortBy === 'harvest') arr = arr.sort((a, b) => a.daysToHarvest - b.daysToHarvest);
    return arr;
  }, [filterCrop, sortBy, searchQ]);

  // Aggregate supply forecast stats
  const agg = useMemo(() => {
    const relevant = filterCrop === 'All' ? farmersList : farmersList.filter(f => f.crop === filterCrop);
    return {
      totalFarmers: relevant.length,
      totalArea: relevant.reduce((s, f) => s + f.area, 0),
      totalYield: relevant.reduce((s, f) => s + f.estimatedYieldTons, 0),
      avgNdvi: relevant.reduce((s, f) => s + f.ndvi, 0) / relevant.length,
      alertCount: relevant.filter(f => f.hasAlert).length,
      excellentCount: relevant.filter(f => f.ndvi >= 0.75).length,
      poorCount: relevant.filter(f => f.ndvi < 0.35).length,
    };
  }, [filterCrop]);

  const aggLevel = getLevel(agg.avgNdvi);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#080e08' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-5 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid #1a2a1a' }}>
        <button onClick={() => navigateTo('home')} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">Corporate Overview</p>
          <h1 className="text-white text-base font-black">Bird's Eye Farm Dashboard</h1>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
          <Users size={11} className="text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-400">{farmersList.length} Farmers</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="animate-spin text-emerald-500 mx-auto" size={32} />
            <p className="text-gray-500 text-sm font-medium">Fetching portfolio data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-4 pt-3 pb-0">
            <div className="flex rounded-xl p-1 gap-1" style={{ background: '#111811' }}>
              <button onClick={() => setActiveTab('overview')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'overview' ? 'bg-emerald-500 text-black' : 'text-gray-600'}`}>
                🗺 Overview
              </button>
              <button onClick={() => setActiveTab('supply')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'supply' ? 'bg-emerald-500 text-black' : 'text-gray-600'}`}>
                📦 Supply Chain
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-6">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div>
            {/* Aggregate stats strip */}
            <div className="px-4 pt-4 pb-3">
              <div className="rounded-2xl p-4" style={{ background: `linear-gradient(135deg, ${aggLevel.bg} 0%, #0f1f0f 100%)`, border: `1px solid ${aggLevel.color}30` }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Portfolio Average NDVI</p>
                  <Satellite size={12} className="text-emerald-400" />
                </div>
                <div className="flex items-end gap-3 mb-3">
                  <span className="text-5xl font-black" style={{ color: aggLevel.color }}>
                    {(agg.avgNdvi * 100).toFixed(0)}
                  </span>
                  <div className="mb-1">
                    <span className="block text-xs font-black uppercase" style={{ color: aggLevel.color }}>{aggLevel.label}</span>
                    <span className="block text-[9px] text-gray-600">{agg.totalFarmers} farmers · {agg.totalArea.toLocaleString()} acres total</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '🚨 Need Attention', value: agg.alertCount, color: '#ef4444' },
                    { label: '✅ Excellent', value: agg.excellentCount, color: '#22c55e' },
                    { label: '⚠ Low Health', value: agg.poorCount, color: '#f97316' },
                  ].map(s => (
                    <div key={s.label} className="text-center rounded-xl py-2" style={{ background: '#ffffff08' }}>
                      <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[8px] text-gray-600">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Search + Filter */}
            <div className="px-4 pb-3 space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#0d150d', border: '1px solid #1a2a1a' }}>
                <Search size={13} className="text-gray-600" />
                <input
                  type="text"
                  placeholder="Search farmer or farm name..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="flex-1 bg-transparent text-[12px] text-white placeholder-gray-700 outline-none"
                />
              </div>

              {/* Crop filter chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {crops.map(c => (
                  <button
                    key={c}
                    onClick={() => setFilterCrop(c)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all"
                    style={filterCrop === c
                      ? { background: '#22c55e', color: '#000' }
                      : { background: '#0d150d', color: '#6b7280', border: '1px solid #1a2a1a' }
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Sort buttons */}
              <div className="flex gap-2">
                {([
                  { id: 'health', label: 'Health' },
                  { id: 'yield', label: 'Yield' },
                  { id: 'harvest', label: 'Harvest Soon' },
                ] as const).map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSortBy(s.id)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${sortBy === s.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-600'}`}
                    style={{ border: `1px solid ${sortBy === s.id ? '#22c55e30' : '#1a2a1a'}` }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Farmer Grid */}
            <div className="px-4 grid grid-cols-2 gap-2">
              {filtered.map(farmer => (
                <FarmerTile
                  key={farmer.id}
                  farmer={farmer}
                  onClick={() => setSelectedFarmer(farmer)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* SUPPLY CHAIN TAB                                                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'supply' && (
          <div className="px-4 pt-4 space-y-4">

            {/* Hero supply forecast */}
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #0f1a2e 100%)', border: '1px solid #1a2a4a' }}>
              <div className="flex items-center gap-2 mb-1">
                <Factory size={14} className="text-blue-400" />
                <p className="text-[9px] text-blue-400/70 font-bold uppercase tracking-[0.2em]">
                  Supply Chain Forecast
                </p>
              </div>
              <p className="text-gray-500 text-xs mb-4">
                Based on current satellite NDVI data across {agg.totalFarmers} registered farmers
              </p>

              <div className="flex items-end gap-3 mb-4">
                <span className="text-5xl font-black text-white">{agg.totalYield.toFixed(0)}</span>
                <div className="mb-1">
                  <span className="block text-sm text-gray-500">tonnes projected</span>
                  <span className="block text-[10px] text-blue-400">this season</span>
                </div>
              </div>

              {/* Confidence bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] text-gray-600 font-bold uppercase">Forecast Confidence</span>
                  <span className="text-[10px] text-blue-400 font-black">
                    {agg.avgNdvi > 0.6 ? '82%' : agg.avgNdvi > 0.4 ? '68%' : '51%'}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1f2f4f' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }}
                    initial={{ width: 0 }}
                    animate={{ width: agg.avgNdvi > 0.6 ? '82%' : agg.avgNdvi > 0.4 ? '68%' : '51%' }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            {/* Crop breakdown */}
            <div className="rounded-2xl p-4" style={{ background: '#0d150d', border: '1px solid #1a2a1a' }}>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-3">Crop-wise Supply Breakdown</p>
              {Array.from(new Set(farmersList.map(f => f.crop))).map(crop => {
                const farmers = farmersList.filter(f => f.crop === crop);
                const totalYield = farmers.reduce((s, f) => s + f.estimatedYieldTons, 0);
                const avgNdvi = farmers.reduce((s, f) => s + f.ndvi, 0) / farmers.length;
                const lvl = getLevel(avgNdvi);
                const maxYield = 600;
                return (
                  <div key={crop} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: lvl.color }} />
                        <span className="text-[11px] text-gray-300 font-bold">{crop}</span>
                        <span className="text-[9px] text-gray-600">({farmers.length} farmers)</span>
                      </div>
                      <span className="text-[11px] font-black text-white">{totalYield.toFixed(0)}t</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1f2f1f' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: lvl.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((totalYield / maxYield) * 100, 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Harvest calendar */}
            <div className="rounded-2xl p-4" style={{ background: '#0d150d', border: '1px solid #1a2a1a' }}>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-3">Harvest Timeline</p>
              {[
                { period: 'Next 30 days', farmers: farmersList.filter(f => f.daysToHarvest <= 30) },
                { period: '30–60 days', farmers: farmersList.filter(f => f.daysToHarvest > 30 && f.daysToHarvest <= 60) },
                { period: '60–90 days', farmers: farmersList.filter(f => f.daysToHarvest > 60) },
              ].map(({ period, farmers }) => {
                const yld = farmers.reduce((s, f) => s + f.estimatedYieldTons, 0);
                return (
                  <div key={period} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #1a2a1a' }}>
                    <div>
                      <p className="text-[11px] text-white font-bold">{period}</p>
                      <p className="text-[9px] text-gray-600">{farmers.length} farmers ready</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-black text-sm">{yld.toFixed(0)}t</p>
                      <p className="text-[9px] text-gray-600">expected</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Use case note */}
            <div className="rounded-xl p-4" style={{ background: '#0a0f1a', border: '1px solid #1a2040' }}>
              <div className="flex items-start gap-3">
                <Building2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-blue-300 font-bold">For Sugarcane Mills & Agri-Processors</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                    No more guessing your procurement. Our platform gives you a live view of every farmer's crop health, yield forecast, and harvest date — so you can plan operations, logistics, and factory capacity months ahead.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* ── Farmer Detail Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedFarmer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end"
            style={{ background: '#00000080', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedFarmer(null)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 28 }}
              className="w-full rounded-t-3xl p-5 space-y-4"
              style={{ background: '#0d150d', border: '1px solid #1a2a1a' }}
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const lvl = getLevel(selectedFarmer.ndvi);
                return (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-black text-lg">{selectedFarmer.name}</p>
                        <p className="text-gray-500 text-xs">{selectedFarmer.farmName} · {selectedFarmer.region}</p>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl font-black text-sm" style={{ background: lvl.bg, color: lvl.text }}>
                        NDVI {(selectedFarmer.ndvi * 100).toFixed(0)}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Crop', value: selectedFarmer.crop },
                        { label: 'Area', value: `${selectedFarmer.area} acres` },
                        { label: 'Harvest', value: `${selectedFarmer.daysToHarvest}d` },
                        { label: 'Est. Yield', value: `${selectedFarmer.estimatedYieldTons}t` },
                        { label: 'Moisture', value: `${selectedFarmer.moisture}%` },
                        { label: 'Health', value: lvl.label },
                      ].map(item => (
                        <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: '#0a1a0a' }}>
                          <p className="text-[9px] text-gray-600 font-bold uppercase">{item.label}</p>
                          <p className="text-white font-black text-sm mt-1">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {selectedFarmer.hasAlert && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#1a0d0d', border: '1px solid #ef444430' }}>
                        <AlertTriangle size={14} className="text-red-400" />
                        <p className="text-red-400 text-[11px] font-bold">
                          {selectedFarmer.ndvi < 0.35 ? 'Low NDVI — possible crop stress or pest attack' : 'Low moisture — irrigation may be required'}
                        </p>
                      </div>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedFarmer(null);
                        navigateTo('field-monitor', { plotId: selectedFarmer.id });
                      }}
                      className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #15803d, #065f46)' }}
                    >
                      <Satellite size={16} />
                      Open Satellite Analysis
                      <ChevronRight size={16} />
                    </motion.button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CorporateDashboardScreen;
