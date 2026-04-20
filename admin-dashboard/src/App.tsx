import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AgritechDashboard from './AgritechDashboard';
import {
  LayoutDashboard, Users, Leaf, FileText, Activity,
  ShieldCheck, LogOut, RefreshCw, Search, Download,
  ChevronUp, ChevronDown, AlertTriangle, CheckCircle2,
  Clock, Sprout, MapPin, TrendingUp, Database, Wifi, WifiOff,
  Eye, Filter, X, ChevronRight, BarChart3, Globe
} from 'lucide-react';

const TOKEN = 'kd_admin_KrishiDrishti2026';
const API = (path: string) => `/api/admin/${path}?token=${TOKEN}`;

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
  joined_at: string; plot_count: number; carbon_projects: number;
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

// ─── Sub-components ──────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color, trend }: any) => (
  <motion.div
    whileHover={{ y: -2, borderColor: 'var(--border-light)' }}
    transition={{ type: 'spring', stiffness: 400 }}
    style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '24px', display: 'flex',
      flexDirection: 'column', gap: 12, cursor: 'default'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ padding: 10, background: color + '20', borderRadius: 10 }}>
        <Icon size={20} color={color} />
      </div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: trend >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {trend >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  </motion.div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, {color: string; bg: string}> = {
    'Verified': { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    'Issued': { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    'Evidence_Pending': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    'Draft': { color: '#888', bg: 'rgba(136,136,136,0.1)' },
    'Rejected': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  };
  const s = map[status] || { color: '#888', bg: 'rgba(136,136,136,0.1)' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      color: s.color, background: s.bg, letterSpacing: '0.05em', whiteSpace: 'nowrap'
    }}>
      {status.replace('_', ' ')}
    </span>
  );
};

const Skeleton = ({ w = '100%', h = 20 }: any) => (
  <div style={{ width: w, height: h, background: 'var(--border)', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

// ─── Farmer Detail Modal ──────────────────────────────────────────────────────
const FarmerModal = ({ farmer, onClose }: { farmer: Farmer; onClose: () => void }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 36, width: '100%', maxWidth: 520 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{farmer.name}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Farmer ID #{farmer.id}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--border)', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
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
            { label: 'Joined', value: farmer.joined_at ? new Date(farmer.joined_at).toLocaleDateString() : '—' },
            { label: 'Total Plots', value: farmer.plot_count },
            { label: 'Carbon Projects', value: farmer.carbon_projects },
            { label: 'Total Credits', value: (farmer.total_credits || 0).toFixed(2) + ' tCO₂' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '12px 16px', background: 'var(--bg-main)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>{label.toUpperCase()}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            style={{ flex: 1, padding: '12px', background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 10, color: 'var(--green)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
          >
            ✓ Verify Farmer
          </button>
          <button
            style={{ flex: 1, padding: '12px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 10, color: 'var(--red)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
          >
            ✕ Flag for Review
          </button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

// ─── Views ───────────────────────────────────────────────────────────────────
const OverviewView = () => {
  const { data: stats, loading } = useApi<Stats>(API('stats'));
  
  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Platform Overview</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Real-time metrics across all registered farmers and fields</p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} h={140} />) : stats && (<>
          <KpiCard icon={Users} label="Registered Farmers" value={stats.total_farmers.toLocaleString()} color="var(--blue)" trend={12} />
          <KpiCard icon={MapPin} label="Total Farm Plots" value={stats.total_plots.toLocaleString()} color="var(--green)" trend={8} />
          <KpiCard icon={Sprout} label="Carbon Projects" value={stats.total_projects.toLocaleString()} sub={`${stats.pending_queue} pending review`} color="var(--purple)" />
          <KpiCard icon={Leaf} label="Credits Issued" value={`${stats.total_credits_issued.toFixed(0)} tCO₂`} sub={`₹${stats.total_payout_inr.toLocaleString()} payout`} color="var(--amber)" trend={5} />
        </>)}
      </div>

      {/* Bottom Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* District Breakdown */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>Farmers by District</h3>
          {loading ? <Skeleton h={200} /> : stats?.districts.slice(0, 6).map((d, i) => {
            const max = stats.districts[0]?.count || 1;
            return (
              <div key={d.district} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{d.district}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{d.count}</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.count / max) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                    style={{ height: '100%', background: 'var(--green)', borderRadius: 3 }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Project Status */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>Carbon Project Status</h3>
          {loading ? <Skeleton h={200} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats?.project_statuses.map(ps => {
                const colors: Record<string, string> = { Verified: 'var(--green)', Issued: 'var(--blue)', Evidence_Pending: 'var(--amber)', Rejected: 'var(--red)', Draft: 'var(--text-muted)' };
                return (
                  <div key={ps.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-main)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[ps.status] || 'var(--text-muted)' }} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ps.status.replace('_', ' ')}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{ps.count}</span>
                  </div>
                );
              })}
            </div>
          )}
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

  const { data, loading, refetch } = useApi<{ farmers: Farmer[]; total: number }>(
    `${API('farmers')}&search=${search}&skip=${page * limit}&limit=${limit}`,
    [search, page]
  );

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Farmer Registry</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            {data ? `${data.total} registered farmers` : 'Loading...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href={`/api/admin/export/farmers?token=${TOKEN}`} download>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              <Download size={15} /> Export CSV
            </button>
          </a>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by name, phone, district..."
          style={{
            width: '100%', padding: '12px 12px 12px 40px', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-primary)',
            fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif'
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Farmer', 'Location', 'Plots', 'Carbon Projects', 'Credits (tCO₂)', 'Joined', 'Action'].map(h => (
                <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', background: 'var(--bg-main)' }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array(8).fill(0).map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                {Array(7).fill(0).map((_, j) => (
                  <td key={j} style={{ padding: '16px 20px' }}><Skeleton h={16} w="80%" /></td>
                ))}
              </tr>
            )) : data?.farmers.map((f, i) => (
              <motion.tr
                key={f.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>ID #{f.id}</div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.district || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.state || ''}</div>
                </td>
                <td style={{ padding: '16px 20px', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{f.plot_count}</td>
                <td style={{ padding: '16px 20px', fontWeight: 700, fontSize: 16, color: 'var(--blue)' }}>{f.carbon_projects}</td>
                <td style={{ padding: '16px 20px', fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>{(f.total_credits || 0).toFixed(2)}</td>
                <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {f.joined_at ? new Date(f.joined_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <button
                    onClick={() => setSelectedFarmer(f)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--blue-dim)', border: '1px solid var(--blue)', borderRadius: 8, color: 'var(--blue)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                  >
                    <Eye size={13} /> View
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.total > limit && (
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, data.total)} of {data.total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '7px 16px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, color: page === 0 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>Prev</button>
              <button disabled={(page + 1) * limit >= data.total} onClick={() => setPage(p => p + 1)} style={{ padding: '7px 16px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, color: (page + 1) * limit >= data.total ? 'var(--text-muted)' : 'var(--text-primary)', cursor: (page + 1) * limit >= data.total ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Farmer Modal */}
      {selectedFarmer && <FarmerModal farmer={selectedFarmer} onClose={() => setSelectedFarmer(null)} />}
    </div>
  );
};

const CarbonView = () => {
  const { data, loading, refetch } = useApi<{projects: CarbonProject[]; total: number}>(API('carbon-queue') + '&limit=50');

  const approve = async (id: number) => {
    try {
      await axios.post(`/api/admin/carbon/${id}/approve?token=${TOKEN}`, { credits_to_issue: 10, admin_note: 'Auto-approved from admin dashboard' });
      refetch();
    } catch (e) { alert('Approval failed'); }
  };

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Carbon Credit Queue</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Review and approve/reject farmer carbon credit submissions</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? Array(5).fill(0).map((_, i) => <Skeleton key={i} h={100} />) :
          data?.projects.map((p, i) => (
            <motion.div
              key={p.project_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24 }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{p.farmer_name}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>Plot #{p.plot_id}</span>
                  <span>Method: {p.methodology}</span>
                  <span>Est: {p.estimated_credits?.toFixed(2)} tCO₂</span>
                  <span>NDVI Δ: {((p.current_ndvi || 0) - (p.baseline_ndvi || 0)).toFixed(3)}</span>
                </div>
              </div>
              {p.status === 'Evidence_Pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => approve(p.project_id)} style={{ padding: '8px 18px', background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 8, color: 'var(--green)', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    ✓ Approve
                  </button>
                  <button style={{ padding: '8px 18px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    ✕ Reject
                  </button>
                </div>
              )}
            </motion.div>
          ))
        }
        {!loading && (!data?.projects.length) && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <CheckCircle2 size={40} style={{ marginBottom: 12, color: 'var(--green)' }} />
            <div style={{ fontWeight: 700, fontSize: 16 }}>No Pending Projects</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>All carbon project submissions have been reviewed</div>
          </div>
        )}
      </div>
    </div>
  );
};

const AuditView = () => {
  const { data, loading } = useApi<{logs: any[]; total: number}>(API('audit-log') + '&limit=50');

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Operations Audit Log</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>All farmer and field operations across the platform</p>
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Time', 'Farmer', 'Operation', 'Plot', 'Detail'].map(h => (
                <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', background: 'var(--bg-main)' }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array(10).fill(0).map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                {Array(5).fill(0).map((_, j) => <td key={j} style={{ padding: '14px 20px' }}><Skeleton h={14} w="80%" /></td>)}
              </tr>
            )) : data?.logs.map((log, i) => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>ID #{log.user_id}</td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--amber)', background: 'var(--amber-dim)', padding: '2px 8px', borderRadius: 6 }}>
                    {log.operation}
                  </span>
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>{log.plot_id ? `#${log.plot_id}` : '—'}</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.detail || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'farmers', label: 'Farmer Registry', icon: Users },
  { id: 'carbon', label: 'Carbon Queue', icon: Leaf },
  { id: 'audit', label: 'Audit Log', icon: FileText },
];

const Sidebar = ({ active, setActive }: { active: string; setActive: (v: string) => void }) => (
  <div style={{ width: 240, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
    {/* Logo */}
    <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, background: 'var(--green)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sprout size={18} color="#000" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.2 }}>Krishi-Drishti</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Admin Console</div>
        </div>
      </div>
    </div>

    {/* Nav */}
    <nav style={{ padding: '16px 12px', flex: 1 }}>
      {NAV.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <motion.button
            key={id}
            onClick={() => setActive(id)}
            whileHover={{ x: 2 }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              marginBottom: 2, textAlign: 'left', fontSize: 14, fontWeight: isActive ? 600 : 400,
              background: isActive ? 'var(--green-dim)' : 'transparent',
              color: isActive ? 'var(--green)' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={17} />
            {label}
            {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
          </motion.button>
        );
      })}
    </nav>

    {/* Footer */}
    <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--green-dim)', borderRadius: 10, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Backend Live</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 12px' }}>
        Ops Token: {TOKEN.slice(0, 10)}...
      </div>
    </div>
  </div>
);

// ─── Header ──────────────────────────────────────────────────────────────────
const Header = ({ view, onRefresh, onLogout }: { view: string; onRefresh: () => void; onLogout: () => void }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-sidebar)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={16} color="var(--green)" />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Admin Dashboard</span>
        <ChevronRight size={14} color="var(--text-muted)" />
        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>{view}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          {time.toLocaleTimeString()}
        </span>
        <button onClick={onRefresh} title="Refresh" style={{ padding: '7px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
          <RefreshCw size={14} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <Wifi size={13} color="var(--green)" />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>localhost:8000</span>
        </div>
        {/* Back to landing page */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onLogout}
          title="Back to landing page & logout"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, cursor: 'pointer',
            color: 'var(--red)', fontWeight: 600, fontSize: 12
          }}
        >
          <LogOut size={13} />
          Logout
        </motion.button>
      </div>
    </div>
  );
};

// ─── Login Modal Overlay ──────────────────────────────────────────────────────
const LoginModal = ({ onLogin, onClose }: { onLogin: () => void; onClose: () => void }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleLogin = async () => {
    setChecking(true); setError('');
    try {
      await axios.get(`/api/admin/stats?token=${token}`);
      localStorage.setItem('kd_admin_token', token);
      onLogin();
    } catch {
      setError('Invalid token. Please check your ADMIN_SECRET_TOKEN.');
    } finally { setChecking(false); }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#111', border: '1px solid #2a2a2a', borderRadius: 24,
            padding: '48px 40px', width: '100%', maxWidth: 420, position: 'relative'
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 16, right: 16, background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#888', display: 'flex' }}
          >
            <X size={16} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ width: 56, height: 56, background: 'var(--green)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ShieldCheck size={26} color="#000" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Admin Console</h2>
            <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Enter your secret token to proceed</p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#666', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>ADMIN SECRET TOKEN</label>
            <input
              autoFocus
              type="password"
              value={token}
              onChange={e => { setToken(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="kd_admin_••••••••••••••"
              style={{
                width: '100%', padding: '13px 16px', background: '#1a1a1a',
                border: `1px solid ${error ? '#ef4444' : '#2a2a2a'}`, borderRadius: 12,
                color: '#fff', fontSize: 14, outline: 'none',
                fontFamily: 'JetBrains Mono, monospace'
              }}
            />
            {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</p>}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleLogin}
            disabled={checking || !token}
            style={{
              width: '100%', padding: '14px',
              background: checking || !token ? '#222' : 'var(--green)',
              border: 'none', borderRadius: 12,
              color: checking || !token ? '#555' : '#000',
              fontWeight: 800, fontSize: 15,
              cursor: checking || !token ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {checking
              ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</>
              : <>Enter Admin Console <ChevronRight size={16} /></>}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('kd_admin_token'));
  const [showLogin, setShowLogin] = useState(false);
  const [view, setView] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Authenticated → full admin console ──────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('kd_admin_token');
    setAuthed(false);
  };

  if (authed) {
    const renderView = () => {
      switch (view) {
        case 'overview': return <OverviewView key={refreshKey} />;
        case 'farmers':  return <FarmersView  key={refreshKey} />;
        case 'carbon':   return <CarbonView   key={refreshKey} />;
        case 'audit':    return <AuditView    key={refreshKey} />;
        default:         return <OverviewView />;
      }
    };

    return (
      <div className="admin-console" style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%' }}>
        <Sidebar active={view} setActive={setView} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header view={view} onRefresh={() => setRefreshKey(k => k + 1)} onLogout={handleLogout} />
          <main style={{ flex: 1, overflowY: 'auto' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        `}</style>
      </div>
    );
  }

  // ── Public landing page ──────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative' }}>
      {/* Floating Admin Login pill */}
      <motion.button
        id="admin-login-btn"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowLogin(true)}
        style={{
          position: 'fixed', top: 16, right: 20, zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px',
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(74,222,128,0.4)',
          borderRadius: 50,
          color: '#4ade80',
          fontWeight: 700, fontSize: 13,
          cursor: 'pointer',
          boxShadow: '0 0 20px rgba(74,222,128,0.12)'
        }}
      >
        <ShieldCheck size={15} />
        Admin Login
      </motion.button>

      {/* AgritechDashboard as public landing */}
      <AgritechDashboard />

      {/* Login modal */}
      {showLogin && (
        <LoginModal
          onLogin={() => { setAuthed(true); setShowLogin(false); }}
          onClose={() => setShowLogin(false)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
