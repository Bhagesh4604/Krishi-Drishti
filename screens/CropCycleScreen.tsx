import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Leaf, Droplets, Wind,
  AlertTriangle, CheckCircle2, ChevronRight,
  Sprout, MapPin, Calendar, Plus, Clock,
  Tractor, Wheat, ShieldCheck, Loader2, Package
} from 'lucide-react';
import { Screen } from '../types';
import { cropCycleService, getUserLocation } from '../src/services/api';

interface Props {
  navigateTo: (screen: Screen, data?: any) => void;
  screenData?: any;
  t?: any;
}

const EVENT_ICONS: any = {
  'Sowing': <Sprout size={20} />,
  'Fertilizing': <Leaf size={20} />,
  'Irrigation': <Droplets size={20} />,
  'Weeding': <Tractor size={20} />,
  'Inspection': <ShieldCheck size={20} />,
  'Harvest': <Wheat size={20} />
};

const EVENT_COLORS: any = {
  'Sowing': 'bg-emerald-500 text-black',
  'Fertilizing': 'bg-blue-500 text-white',
  'Irrigation': 'bg-cyan-500 text-white',
  'Weeding': 'bg-orange-500 text-white',
  'Inspection': 'bg-purple-500 text-white',
  'Harvest': 'bg-yellow-500 text-black'
};

const CropCycleScreen: React.FC<Props> = ({ navigateTo, screenData }) => {
  const plotId = screenData?.plotId;
  const [loading, setLoading] = useState(true);
  const [cycleData, setCycleData] = useState<any>(null);
  
  const [showLogModal, setShowLogModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ type: 'Irrigation', notes: '' });
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    if (!plotId) return;
    loadCycle();
  }, [plotId]);

  const loadCycle = async () => {
    try {
      setLoading(true);
      const data = await cropCycleService.getCycles(plotId);
      setCycleData(data);
    } catch (e) {
      console.error("Failed to load crop cycle:", e);
    } finally {
      setLoading(false);
    }
  };

  const startNewCycle = async () => {
    try {
      setLoading(true);
      await cropCycleService.startCycle(plotId, { crop_type: 'Wheat', variety: 'Sharbati' });
      await loadCycle();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleLogEvent = async () => {
    if (!cycleData?.cycle) return;
    try {
      setIsLogging(true);
      
      let lat: number | undefined;
      let lng: number | undefined;
      
      try {
        const location = await getUserLocation();
        if (location) {
          lat = location.lat;
          lng = location.lng;
        }
      } catch (e) {
        console.warn("Location failed, proceeding without location");
      }

      await cropCycleService.logEvent(cycleData.cycle.id, {
        event_type: newEvent.type,
        notes: newEvent.notes,
        geo_lat: lat,
        geo_lng: lng
      });

      setShowLogModal(false);
      setNewEvent({ type: 'Irrigation', notes: '' });
      await loadCycle();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLogging(false);
    }
  };

  if (!plotId) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center text-gray-500">
        Missing Plot ID. Go back and select a plot.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#0a0f0a' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-5 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid #1a2a1a' }}>
        <button onClick={() => navigateTo('field-monitor', { plotId })} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">MRV Logger</p>
          <h1 className="text-white text-base font-black">Crop Cycle Timeline</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-500" /></div>
        ) : !cycleData?.cycle ? (
          <div className="text-center py-12">
            <Sprout size={48} className="mx-auto text-gray-600 mb-4" />
            <h2 className="text-white font-bold text-lg mb-2">No Active Cycle</h2>
            <p className="text-gray-500 text-sm mb-6">Start a new crop cycle to begin logging events for carbon verification.</p>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={startNewCycle}
              className="px-6 py-3 bg-emerald-500 text-black font-black rounded-xl text-sm"
            >
              Start New Cycle (Wheat)
            </motion.button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cycle Header */}
            <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #101c10 0%, #0a0f0a 100%)', border: '1px solid #1a2a1a' }}>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Active Crop</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white">{cycleData.cycle.crop_type}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    {cycleData.cycle.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Started {new Date(cycleData.cycle.start_date).toLocaleDateString()}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                <Wheat size={24} className="text-emerald-500" />
              </div>
            </div>

            {/* Timeline */}
            <div className="relative pl-6 border-l-2 border-gray-800 space-y-8 py-2">
              {cycleData.events.map((event: any, i: number) => (
                <div key={event.id} className="relative">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[35px] w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-[#0a0f0a] ${EVENT_COLORS[event.event_type] || 'bg-gray-500 text-white'}`}>
                    {EVENT_ICONS[event.event_type] || <CheckCircle2 size={16} />}
                  </div>

                  <div className="rounded-2xl p-4" style={{ background: '#0d150d', border: '1px solid #1a2a1a' }}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-black">{event.event_type}</h3>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {new Date(event.event_date).toLocaleDateString()} {new Date(event.event_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>

                    {event.notes && <p className="text-sm text-gray-400 mb-3">{event.notes}</p>}

                    <div className="flex items-center gap-4 mt-2 pt-3 border-t border-gray-800">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <MapPin size={12} />
                        <span className="text-[10px] font-bold">
                          {event.geo_lat && event.geo_lng ? `${event.geo_lat.toFixed(4)}, ${event.geo_lng.toFixed(4)}` : 'GPS Not captured'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-400">
                        <ShieldCheck size={12} />
                        <span className="text-[10px] font-bold">Verified Hash</span>
                      </div>
                    </div>
                    {/* Hash display */}
                    <div className="mt-2 text-[8px] font-mono text-gray-700 truncate w-full">
                      {event.event_hash}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {cycleData.cycle.status === 'Active' && (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setShowLogModal(true)}
                className="w-full py-4 rounded-xl flex items-center justify-center gap-2 border border-dashed border-emerald-500/50 text-emerald-400 font-black hover:bg-emerald-500/10 transition-colors"
              >
                <Plus size={20} />
                Log Next Event
              </motion.button>
            )}

            {cycleData.cycle.status === 'Harvested' && (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigateTo('marketplace')}
                className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-black text-black"
                style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)' }}
              >
                <Package size={20} />
                Mint Harvest Token
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* ── Log Modal ────────────────────────────────────────────────────────── */}
      {showLogModal && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ background: '#000000A0', backdropFilter: 'blur(4px)' }} onClick={() => setShowLogModal(false)}>
          <motion.div
            initial={{ y: 300 }} animate={{ y: 0 }}
            className="w-full rounded-t-3xl p-6"
            style={{ background: '#0d150d', borderTop: '1px solid #1a2a1a' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-white font-black text-xl mb-4">Log Event</h2>
            
            <div className="mb-4">
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">Event Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['Sowing', 'Fertilizing', 'Irrigation', 'Weeding', 'Inspection', 'Harvest'].map(t => (
                  <button
                    key={t}
                    onClick={() => setNewEvent({ ...newEvent, type: t })}
                    className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${newEvent.type === t ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-[#0a0f0a] text-gray-400 border-gray-800'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-2 block">Notes / Details</label>
              <textarea
                value={newEvent.notes}
                onChange={e => setNewEvent({ ...newEvent, notes: e.target.value })}
                placeholder="E.g. Applied 50kg Urea"
                className="w-full bg-[#0a0f0a] border border-gray-800 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
              <MapPin size={14} className="flex-shrink-0" />
              <p>Your current GPS location will be captured to verify this event on the blockchain.</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleLogEvent}
              disabled={isLogging}
              className="w-full py-3.5 rounded-xl bg-emerald-500 text-black font-black flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLogging ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              {isLogging ? 'Capturing GPS...' : 'Save & Cryptographically Sign'}
            </motion.button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CropCycleScreen;
