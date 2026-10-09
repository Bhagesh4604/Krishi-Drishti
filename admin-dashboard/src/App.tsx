import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import axios from 'axios';
import AgritechDashboard from './AgritechDashboard';
import {
  LayoutDashboard, Users, Leaf, FileText, Activity,
  ShieldCheck, LogOut, RefreshCw, Search, Download,
  ChevronUp, ChevronDown, AlertTriangle, CheckCircle2,
  Clock, Sprout, MapPin, TrendingUp, Database, Wifi, WifiOff,
  Eye, Filter, X, ChevronRight, BarChart3, Globe, Server, Bot
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, Cell,
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || 'https://krishi-drishti-api.onrender.com/api';
const API = (path: string) => `${API_BASE}/admin/${path}?token=${localStorage.getItem('kd_admin_token')}`;

// ─── Types ───────────────────────────────────────────────────────────────────
interface Stats {
  total_farmers: number; total_plots: number; total_projects: number;
  pending_queue: number; total_credits_issued: number; total_payout_inr: number;
  total_field_scans: number; districts: {district:string; count:number}[];
  methodologies: {methodology:string; count:number}[];
  project_statuses: {status:string; count:number}[];
  monthly_credits: {month:string; credits:number}[];
}

interface Farmer {
  id: number; name: string; phone: string; email: string;
  district: string; state: string; village: string;
  created_at: string; plots_count: number; projects_count: number;
  total_credits: number; status?: string;
}

interface CarbonProject {
  project_id: number; farmer_name: string; farmer_phone: string;
  plot_id: number; methodology: string; status: string;
  baseline_ndvi: number; current_ndvi: number; estimated_credits: number;
  verified_credits: number; available_credits: number; submitted_at: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────
function useApi<T>(url: string, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(url);
      setData(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message);
    } finally { setLoading(false); }
  }, [url]);

  useEffect(() => { fetch(); }, [...deps, fetch]);
  return { data, loading, error, refetch: fetch };
}

// ─── Visual Components (3D & Animations) ─────────────────────────────────────
const glassCard = {
  background: 'rgba(2,15,8,0.7)',
  border: '1px solid rgba(0,255,135,0.1)',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-8, 8]);
  const sX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const sY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX: sX, rotateY: sY, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = end / 60;
    const t = setInterval(() => {
      cur += step;
      if (cur >= end) { setCount(end); clearInterval(t); }
      else setCount(Math.floor(cur));
    }, 16);
    return () => clearInterval(t);
  }, [end]);
  return <span>{count.toLocaleString()}{suffix}</span>;
}

function ParticleField() {
  const pts = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    s: Math.random() * 2 + 1, d: Math.random() * 18 + 8, delay: Math.random() * -18,
  })), []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {pts.map(p => (
        <motion.div
          key={p.id}
          style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, borderRadius: '50%', background: 'rgba(0,255,135,0.4)' }}
          animate={{ y: [0, -100, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.d, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function OrbitGlobe() {
  const dots = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    angle: (i / 8) * 360,
    color: ["#00ff87", "#00d4ff", "#c77dff", "#ffd93d", "#ff6b6b", "#ff9f43", "#00ff87", "#00d4ff"][i],
  })), []);

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 140, height: 140 }}>
      <motion.div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(0,255,135,0.2)' }} animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
      <motion.div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.3)' }} animate={{ rotate: -360 }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }} />
      <div style={{
        position: 'relative', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: "radial-gradient(ellipse at 35% 35%, rgba(0,255,135,0.5) 0%, rgba(0,40,20,0.9) 70%)",
        boxShadow: "0 0 30px rgba(0,255,135,0.4), inset 0 0 20px rgba(0,0,0,0.5)",
        border: "1px solid rgba(0,255,135,0.3)", overflow: 'hidden'
      }}>
        <Globe size={24} color="rgba(0,255,135,0.8)" />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.2 }}>
          {[30, 50, 70].map(yp => (
            <div key={yp} style={{ position: 'absolute', width: '100%', borderTop: '1px solid #00ff87', top: `${yp}%` }} />
          ))}
        </div>
      </div>
      {dots.map((dot, i) => (
        <motion.div key={i} style={{ position: 'absolute', width: 140, height: 140 }} animate={{ rotate: [dot.angle, dot.angle + 360] }} transition={{ duration: 12 + i * 0.5, repeat: Infinity, ease: "linear" }}>
          <motion.div style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: dot.color, boxShadow: `0 0 10px ${dot.color}`, top: 0, left: "50%", transform: "translateX(-50%)" }} animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.25 }} />
        </motion.div>
      ))}
    </div>
  );
}

const GlowTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ padding: '12px 16px', borderRadius: 16, background: "rgba(2,11,6,0.95)", border: "1px solid rgba(0,255,135,0.3)", backdropFilter: "blur(20px)", boxShadow: "0 0 20px rgba(0,255,135,0.2)" }}>
      <p style={{ fontSize: 10, color: '#00ff87', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.name}: {p.value.toLocaleString()}</p>
      ))}
    </div>
  );
};

const Skeleton = ({ w = '100%', h = 20 }: any) => (
  <div style={{ width: w, height: h, background: 'rgba(255,255,255,0.05)', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

// ─── Farmer Detail Modal ──────────────────────────────────────────────────────
const FarmerModal = ({ farmer, onClose }: { farmer: Farmer; onClose: () => void }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ ...glassCard, borderRadius: 24, padding: 36, width: '100%', maxWidth: 520 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{farmer.name}</h2>
            <p style={{ fontSize: 13, color: '#00ff87', fontWeight: 600 }}>Farmer ID #{farmer.id}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: 8, cursor: 'pointer', color: '#aaa' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Phone', value: farmer.phone || '—' },
            { label: 'Email', value: farmer.email || '—' },
            { label: 'District', value: farmer.district || '—' },
            { label: 'State', value: farmer.state || '—' },
            { label: 'Village', value: farmer.village || '—' },
            { label: 'Joined', value: farmer.created_at ? new Date(farmer.created_at).toLocaleDateString() : '—' },
            { label: 'Total Plots', value: farmer.plots_count },
            { label: 'Carbon Projects', value: farmer.projects_count },
            { label: 'Total Credits', value: (farmer.total_credits || 0).toFixed(2) + ' tCO₂' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 10, color: '#aaa', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>{label.toUpperCase()}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{value}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

// ─── Views ───────────────────────────────────────────────────────────────────
const OverviewView = () => {
  const { data: stats, loading } = useApi<Stats>(API('stats'));

  // Normalize backend data to match expected chart keys or use fallback
  const areaData = stats?.monthly_credits?.length ? stats.monthly_credits.map((m: any) => ({
    name: m.month,
    credits: m.credits
  })) : [
    { name: "Jan", credits: 2400 },
    { name: "Feb", credits: 3908 },
    { name: "Mar", credits: 3000 },
    { name: "Apr", credits: 4800 },
    { name: "May", credits: 7000 },
  ];

  const radarData = [
    { metric: "Crop Yield", value: 88 },
    { metric: "Water Usage", value: 72 },
    { metric: "Pest Control", value: 90 },
    { metric: "Soil Health", value: 65 },
    { metric: "AI Accuracy", value: 95 },
    { metric: "Market Price", value: 78 },
  ];

  return (
    <div style={{ padding: '32px 36px', position: 'relative', zIndex: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 12 }}>
            Platform Overview
            <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.3)', borderRadius: 20, color: '#00ff87', fontWeight: 900, letterSpacing: '0.1em' }}>LIVE</motion.span>
          </h1>
          <p style={{ color: '#888', fontSize: 15, marginTop: 6 }}>Real-time metrics across all registered farmers and fields</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Registered Farmers', value: stats?.total_farmers || 0, icon: Users, color: '#00ff87' },
          { label: 'Total Farm Plots', value: stats?.total_plots || 0, icon: MapPin, color: '#00d4ff' },
          { label: 'Carbon Projects', value: stats?.total_projects || 0, icon: Sprout, color: '#c77dff' },
          { label: 'Credits Issued', value: stats?.total_credits_issued || 0, icon: Leaf, color: '#ffd93d', suffix: ' tCO₂' },
        ].map((m, i) => (
          <TiltCard key={i}>
            <div style={{ ...glassCard, padding: 24, borderRadius: 20, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: m.color, filter: 'blur(40px)', opacity: 0.15 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{m.label}</p>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>
                    {loading ? <Skeleton w={80} h={30} /> : <AnimatedCounter end={m.value} suffix={m.suffix} />}
                  </div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: `${m.color}20`, border: `1px solid ${m.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <m.icon size={20} color={m.color} />
                </div>
              </div>
            </div>
          </TiltCard>
        ))}
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Area Chart */}
        <div style={{ ...glassCard, padding: 24, borderRadius: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 20 }}>Platform Analytics - Credits Issued</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00ff87" stopOpacity={0.4}/><stop offset="95%" stopColor="#00ff87" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => Intl.NumberFormat('en', { notation: "compact" }).format(val)} width={50} />
              <Tooltip content={<GlowTooltip />} />
              <Area type="monotone" dataKey="credits" stroke="#00ff87" strokeWidth={3} fill="url(#gC)" name="Credits Issued (tCO₂)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orbit Globe */}
        <TiltCard>
          <div style={{ ...glassCard, padding: 24, borderRadius: 20, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 16, left: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>Coverage Map</h3>
              <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Live node connections</p>
            </div>
            <div style={{ marginTop: 20 }}><OrbitGlobe /></div>
          </div>
        </TiltCard>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Radar */}
        <div style={{ ...glassCard, padding: 24, borderRadius: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 16 }}>AI Performance Model</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(199,125,255,0.2)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#888", fontSize: 10, fontWeight: 700 }} />
              <PolarRadiusAxis tick={false} domain={[0, 100]} axisLine={false} />
              <Radar dataKey="value" stroke="#c77dff" fill="#c77dff" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Districts Bar Chart */}
        <div style={{ ...glassCard, padding: 24, borderRadius: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 16 }}>Farmers by District</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.districts || []} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="district" tick={{ fill: "#888", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => Intl.NumberFormat('en', { notation: "compact" }).format(val)} width={40} />
              <Tooltip content={<GlowTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Farmers" fill="#00ff87" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project Status */}
        <div style={{ ...glassCard, padding: 24, borderRadius: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 20 }}>Project Status Overview</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} h={40} />) : stats?.project_statuses.map(ps => {
              const colors: Record<string, string> = { Verified: '#00ff87', Issued: '#00d4ff', Evidence_Pending: '#ffd93d', Rejected: '#ff6b6b', Draft: '#888' };
              const c = colors[ps.status] || '#888';
              return (
                <div key={ps.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 10px ${c}` }} />
                    <span style={{ fontSize: 12, color: '#ddd', fontWeight: 600 }}>{ps.status.replace('_', ' ')}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{ps.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const FarmersView = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const limit = 20;

  const { data, loading } = useApi<{ farmers: Farmer[]; total: number }>(
    `${API('farmers')}&search=${search}&skip=${page * limit}&limit=${limit}`,
    [search, page]
  );

  return (
    <div style={{ padding: '32px 36px', position: 'relative', zIndex: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Farmer Registry</h1>
          <p style={{ color: '#888', fontSize: 15, marginTop: 4 }}>{data ? `${data.total} registered farmers` : 'Loading...'}</p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by name, phone, district..."
          style={{ width: '100%', padding: '16px 16px 16px 48px', ...glassCard, borderRadius: 16, color: '#fff', fontSize: 15, outline: 'none' }}
        />
      </div>

      <div style={{ ...glassCard, borderRadius: 20, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)' }}>
              {['Farmer', 'Location', 'Plots', 'Carbon Projects', 'Credits', 'Joined', 'Action'].map(h => (
                <th key={h} style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array(8).fill(0).map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {Array(7).fill(0).map((_, j) => <td key={j} style={{ padding: '16px 24px' }}><Skeleton h={16} w="80%" /></td>)}
              </tr>
            )) : data?.farmers.map((f, i) => (
              <motion.tr
                key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: '#00ff87', marginTop: 4 }}>ID #{f.id}</div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: 13, color: '#ddd' }}>{f.district || '—'}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{f.state || ''}</div>
                </td>
                <td style={{ padding: '16px 24px', fontWeight: 800, fontSize: 16, color: '#fff' }}>{f.plots_count}</td>
                <td style={{ padding: '16px 24px', fontWeight: 800, fontSize: 16, color: '#00d4ff' }}>{f.projects_count}</td>
                <td style={{ padding: '16px 24px', fontWeight: 800, fontSize: 16, color: '#00ff87' }}>{(f.total_credits || 0).toFixed(2)}</td>
                <td style={{ padding: '16px 24px', fontSize: 13, color: '#888' }}>{f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '16px 24px' }}>
                  <button onClick={() => setSelectedFarmer(f)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10, color: '#00d4ff', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                    <Eye size={14} /> View
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedFarmer && <FarmerModal farmer={selectedFarmer} onClose={() => setSelectedFarmer(null)} />}
    </div>
  );
};

const CarbonView = () => {
  const { data, loading, refetch } = useApi<{projects: CarbonProject[]; total: number}>(API('carbon/queue') + '&limit=50');
  const approve = async (id: number) => {
    try { await axios.post(`/api/admin/carbon/${id}/approve?token=${TOKEN}`, { credits_to_issue: 10, admin_note: 'Auto-approved from admin dashboard' }); refetch(); } catch (e) { alert('Approval failed'); }
  };
  return (
    <div style={{ padding: '32px 36px', position: 'relative', zIndex: 10 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Carbon Credit Queue</h1>
        <p style={{ color: '#888', fontSize: 15, marginTop: 4 }}>Review and approve/reject farmer carbon credit submissions</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? Array(5).fill(0).map((_, i) => <Skeleton key={i} h={100} />) :
          data?.projects.map((p, i) => (
            <motion.div key={p.project_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ ...glassCard, borderRadius: 16, padding: '24px', display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 18, color: '#fff' }}>{p.farmer_name}</span>
                  <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,217,61,0.1)', color: '#ffd93d', border: '1px solid rgba(255,217,61,0.3)', fontWeight: 800 }}>{p.status.replace('_', ' ')}</span>
                </div>
                <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#aaa', fontWeight: 600 }}>
                  <span>Plot #{p.plot_id}</span>
                  <span>Method: {p.methodology}</span>
                  <span>Est: <span style={{ color: '#00ff87' }}>{p.estimated_credits?.toFixed(2)} tCO₂</span></span>
                  <span>NDVI Δ: {((p.current_ndvi || 0) - (p.baseline_ndvi || 0)).toFixed(3)}</span>
                </div>
              </div>
              {p.status === 'Evidence_Pending' && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => approve(p.project_id)} style={{ padding: '10px 20px', background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.4)', borderRadius: 12, color: '#00ff87', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>✓ Approve</button>
                  <button style={{ padding: '10px 20px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.4)', borderRadius: 12, color: '#ff6b6b', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>✕ Reject</button>
                </div>
              )}
            </motion.div>
          ))
        }
      </div>
    </div>
  );
};

const AuditView = () => {
  const { data, loading } = useApi<{logs: any[]; total: number}>(API('operations') + '&limit=50');
  return (
    <div style={{ padding: '32px 36px', position: 'relative', zIndex: 10 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Operations Audit Log</h1>
        <p style={{ color: '#888', fontSize: 15, marginTop: 4 }}>All farmer and field operations across the platform</p>
      </div>
      <div style={{ ...glassCard, borderRadius: 20, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)' }}>
              {['Time', 'Farmer', 'Operation', 'Plot', 'Detail'].map(h => (
                <th key={h} style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array(10).fill(0).map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {Array(5).fill(0).map((_, j) => <td key={j} style={{ padding: '16px 24px' }}><Skeleton h={14} w="80%" /></td>)}
              </tr>
            )) : data?.logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                <td style={{ padding: '16px 24px', color: '#aaa', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{new Date(log.created_at).toLocaleString()}</td>
                <td style={{ padding: '16px 24px', color: '#fff', fontWeight: 600 }}>ID #{log.farmer_id}</td>
                <td style={{ padding: '16px 24px' }}><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#ffd93d', background: 'rgba(255,217,61,0.1)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,217,61,0.2)', fontWeight: 800 }}>{log.operation}</span></td>
                <td style={{ padding: '16px 24px', color: '#888' }}>{log.plot_id ? `#${log.plot_id}` : '—'}</td>
                <td style={{ padding: '16px 24px', color: '#aaa', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.detail || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Sidebar & Layout ────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'farmers', label: 'Farmer Registry', icon: Users },
  { id: 'carbon', label: 'Carbon Queue', icon: Leaf },
  { id: 'audit', label: 'Audit Log', icon: FileText },
];

const Sidebar = ({ active, setActive }: { active: string; setActive: (v: string) => void }) => (
  <div style={{ width: 260, background: 'rgba(2,11,6,0.85)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(0,255,135,0.15)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', zIndex: 50 }}>
    <div style={{ padding: '32px 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #00ff87, #00d4ff)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,255,135,0.4)' }}>
          <Sprout size={22} color="#000" />
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, color: '#fff', letterSpacing: '-0.02em' }}>Krishi-Drishti</div>
          <div style={{ fontSize: 11, color: '#00ff87', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Admin Console</div>
        </div>
      </div>
    </div>

    <nav style={{ padding: '24px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {NAV.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <motion.button key={id} onClick={() => setActive(id)} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 14, border: '1px solid', borderColor: isActive ? 'rgba(0,255,135,0.3)' : 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: isActive ? 800 : 600, background: isActive ? 'rgba(0,255,135,0.1)' : 'transparent', color: isActive ? '#00ff87' : '#888', transition: 'all 0.2s' }}>
            <Icon size={18} /> {label}
            {isActive && <motion.div layoutId="navIndicator" style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#00ff87', boxShadow: '0 0 10px #00ff87' }} />}
          </motion.button>
        );
      })}
    </nav>
  </div>
);

const Header = ({ view, onRefresh, onLogout }: { view: string; onRefresh: () => void; onLogout: () => void }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <div style={{ padding: '16px 36px', borderBottom: '1px solid rgba(0,255,135,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(2,11,6,0.6)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldCheck size={18} color="#00ff87" />
        <span style={{ fontSize: 14, color: '#888', fontWeight: 600 }}>Admin Dashboard</span>
        <ChevronRight size={14} color="#555" />
        <span style={{ fontSize: 14, color: '#fff', fontWeight: 800, textTransform: 'capitalize' }}>{view}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(0,255,135,0.05)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: 12 }}>
          <div style={{ width: 6, height: 6, background: '#00ff87', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 12, color: '#00ff87', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>{time.toLocaleTimeString()}</span>
        </div>
        <button onClick={onRefresh} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, cursor: 'pointer', color: '#fff' }}><RefreshCw size={16} /></button>
        <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 12, cursor: 'pointer', color: '#ff6b6b', fontWeight: 800, fontSize: 13 }}><LogOut size={14} /> Logout</button>
      </div>
    </div>
  );
};

const LoginModal = ({ onLogin, onClose }: { onLogin: () => void; onClose: () => void }) => {
  const [token, setToken] = useState('');
  const [checking, setChecking] = useState(false);
  const handleLogin = async () => {
    setChecking(true);
    try { await axios.get(`${API_BASE}/admin/stats?token=${token}`); localStorage.setItem('kd_admin_token', token); onLogin(); }
    catch { alert('Invalid token'); } finally { setChecking(false); }
  };
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} style={{ ...glassCard, borderRadius: 32, padding: '48px 40px', width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #00ff87, #00d4ff)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 30px rgba(0,255,135,0.3)' }}><ShieldCheck size={32} color="#000" /></div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>Secure Auth</h2>
            <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>Enter admin token to proceed</p>
          </div>
          <input type="password" value={token} onChange={e => setToken(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="kd_admin_••••••••••••••" style={{ width: '100%', padding: '16px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,135,0.3)', borderRadius: 16, color: '#00ff87', fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', marginBottom: 24 }} />
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleLogin} disabled={checking || !token} style={{ width: '100%', padding: '16px', background: checking || !token ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #00ff87, #00d4ff)', border: 'none', borderRadius: 16, color: checking || !token ? '#555' : '#000', fontWeight: 900, fontSize: 15, cursor: checking || !token ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>{checking ? 'Verifying...' : 'Authenticate'}</motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('kd_admin_token'));
  const [showLogin, setShowLogin] = useState(false);
  const [view, setView] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  if (authed) {
    const renderView = () => {
      switch (view) {
        case 'overview': return <OverviewView key={refreshKey} />;
        case 'farmers': return <FarmersView key={refreshKey} />;
        case 'carbon': return <CarbonView key={refreshKey} />;
        case 'audit': return <AuditView key={refreshKey} />;
        default: return <OverviewView />;
      }
    };
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', background: 'linear-gradient(135deg, #010d06 0%, #020f08 40%, #041208 100%)', fontFamily: 'Inter, sans-serif' }}>
        <ParticleField />
        <Sidebar active={view} setActive={setView} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          <Header view={view} onRefresh={() => setRefreshKey(k => k + 1)} onLogout={() => { localStorage.removeItem('kd_admin_token'); setAuthed(false); }} />
          <main style={{ flex: 1, overflowY: 'auto' }}>
            <AnimatePresence mode="wait">
              <motion.div key={view} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}>
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <motion.button initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => setShowLogin(true)} style={{ position: 'fixed', top: 16, right: 20, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 50, color: '#4ade80', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 0 20px rgba(74,222,128,0.12)' }}><ShieldCheck size={15} /> Admin Login</motion.button>
      <AgritechDashboard />
      {showLogin && <LoginModal onLogin={() => { setAuthed(true); setShowLogin(false); }} onClose={() => setShowLogin(false)} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } * { box-sizing: border-box; }`}</style>
    </div>
  );
}
