import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import {
  Users, Leaf, TrendingUp, Server, Bell, Search, BarChart3,
  Cpu, Globe, Database, AlertTriangle,
  RefreshCw, ArrowUp, ArrowDown, Sparkles,
  Microscope, Menu, X, Bot, Settings, Home, LogOut,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, Cell,
} from "recharts";

// ─── DATA ────────────────────────────────────────────────────────────────────
const areaData = [
  { name: "Jan", users: 400, revenue: 240, health: 80 },
  { name: "Feb", users: 620, revenue: 398, health: 85 },
  { name: "Mar", users: 500, revenue: 300, health: 78 },
  { name: "Apr", users: 780, revenue: 480, health: 92 },
  { name: "May", users: 1100, revenue: 700, health: 88 },
  { name: "Jun", users: 900, revenue: 600, health: 95 },
  { name: "Jul", users: 1400, revenue: 900, health: 91 },
  { name: "Aug", users: 1200, revenue: 800, health: 87 },
  { name: "Sep", users: 1600, revenue: 1100, health: 93 },
  { name: "Oct", users: 1900, revenue: 1300, health: 97 },
];

const radarData = [
  { metric: "Crop Yield", value: 88 },
  { metric: "Water Usage", value: 72 },
  { metric: "Pest Control", value: 90 },
  { metric: "Soil Health", value: 65 },
  { metric: "AI Accuracy", value: 95 },
  { metric: "Market Price", value: 78 },
];

const distBarData = [
  { state: "MH", count: 1240, color: "#00ff87" },
  { state: "UP", count: 980, color: "#00d4ff" },
  { state: "PB", count: 850, color: "#ff6b6b" },
  { state: "AP", count: 720, color: "#ffd93d" },
  { state: "KA", count: 690, color: "#c77dff" },
  { state: "TN", count: 580, color: "#ff9f43" },
];

const activities = [
  { id: 1, user: "Ramesh Patil", action: "Detected Late Blight on Tomato", time: "2m ago", status: "alert", icon: Microscope },
  { id: 2, user: "Sunita Sharma", action: "Carbon Credit Verified +Rs 2,400", time: "5m ago", status: "success", icon: Leaf },
  { id: 3, user: "Arjun Singh", action: "AI Chat - 47 messages today", time: "12m ago", status: "info", icon: Bot },
  { id: 4, user: "Priya Desai", action: "Marketplace Bid Rs 18,500/qtl", time: "20m ago", status: "success", icon: TrendingUp },
  { id: 5, user: "Vikram Rao", action: "New Registration from Gulbarga", time: "35m ago", status: "info", icon: Users },
  { id: 6, user: "System", action: "Gemini API - 503 rate limit spike", time: "1h ago", status: "alert", icon: AlertTriangle },
];

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "users", label: "Farmers", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "crops", label: "Crop Health", icon: Leaf },
  { id: "market", label: "Market", icon: TrendingUp },
  { id: "satellite", label: "Satellite", icon: Globe },
  { id: "ai", label: "AI Engine", icon: Bot },
  { id: "database", label: "Database", icon: Database },
  { id: "settings", label: "Settings", icon: Settings },
];

const metrics = [
  { id: "users", label: "Active Farmers", value: "12,847", delta: "+18.2%", up: true, icon: Users, color: "#00ff87", glow: "rgba(0,255,135,0.3)", bg: "rgba(0,255,135,0.08)" },
  { id: "revenue", label: "Market Volume", value: "Rs 2.4Cr", delta: "+32.7%", up: true, icon: TrendingUp, color: "#c77dff", glow: "rgba(199,125,255,0.3)", bg: "rgba(199,125,255,0.08)" },
  { id: "health", label: "Avg Crop Health", value: "91.4%", delta: "+4.3%", up: true, icon: Leaf, color: "#ffd93d", glow: "rgba(255,217,61,0.3)", bg: "rgba(255,217,61,0.08)" },
  { id: "server", label: "Server Load", value: "68%", delta: "-11%", up: false, icon: Server, color: "#ff6b6b", glow: "rgba(255,107,107,0.3)", bg: "rgba(255,107,107,0.08)" },
];

// ─── 3D TILT CARD ─────────────────────────────────────────────────────────────
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

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
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

// ─── PARTICLE FIELD ───────────────────────────────────────────────────────────
function ParticleField() {
  const pts = useMemo(() => Array.from({ length: 35 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    s: Math.random() * 2 + 0.5,
    d: Math.random() * 18 + 8,
    delay: Math.random() * -18,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {pts.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-400/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s }}
          animate={{ y: [0, -70, 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.d, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── ORBIT GLOBE ──────────────────────────────────────────────────────────────
function OrbitGlobe() {
  const dots = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    angle: (i / 8) * 360,
    color: ["#00ff87", "#00d4ff", "#c77dff", "#ffd93d", "#ff6b6b", "#ff9f43", "#00ff87", "#00d4ff"][i],
  })), []);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      <motion.div
        className="absolute inset-0 rounded-full border border-emerald-400/20"
        animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute rounded-full border border-cyan-400/30"
        style={{ width: 120, height: 120 }}
        animate={{ rotate: -360 }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />
      <div
        className="relative w-24 h-24 rounded-full flex items-center justify-center"
        style={{
          background: "radial-gradient(ellipse at 35% 35%, rgba(0,255,135,0.5) 0%, rgba(0,40,20,0.9) 70%)",
          boxShadow: "0 0 40px rgba(0,255,135,0.4), inset 0 0 20px rgba(0,0,0,0.5)",
          border: "1px solid rgba(0,255,135,0.3)",
        }}
      >
        <Globe size={28} className="text-emerald-300/80" />
        <div className="absolute inset-0 rounded-full overflow-hidden opacity-20">
          {[30, 50, 70].map(yp => (
            <div key={yp} className="absolute w-full border-t border-emerald-400" style={{ top: `${yp}%` }} />
          ))}
        </div>
      </div>
      {dots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ width: 160, height: 160 }}
          animate={{ rotate: [dot.angle, dot.angle + 360] }}
          transition={{ duration: 12 + i * 0.5, repeat: Infinity, ease: "linear" }}
        >
          <motion.div
            className="absolute w-2.5 h-2.5 rounded-full"
            style={{ background: dot.color, boxShadow: `0 0 8px ${dot.color}`, top: 0, left: "50%", transform: "translateX(-50%)" }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.25 }}
          />
        </motion.div>
      ))}
    </div>
  );
}

// ─── LIVE PULSE BAR ───────────────────────────────────────────────────────────
function LivePulseBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-[11px] font-black" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── GLOW TOOLTIP ─────────────────────────────────────────────────────────────
const GlowTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-4 py-3 rounded-2xl border"
      style={{ background: "rgba(2,11,6,0.95)", borderColor: "rgba(0,255,135,0.3)", backdropFilter: "blur(20px)", boxShadow: "0 0 20px rgba(0,255,135,0.2)" }}
    >
      <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-bold" style={{ color: p.color }}>{p.name}: {p.value.toLocaleString()}</p>
      ))}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AgritechDashboardNew({ t }: { t?: any }) {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState(5);
  const [now, setNow] = useState(new Date());
  const [searchText, setSearchText] = useState("");
  const [pulse, setPulse] = useState({ cpu: 68, ram: 54, api: 89, db: 43 });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setPulse({
        cpu: Math.round(60 + Math.random() * 25),
        ram: Math.round(45 + Math.random() * 30),
        api: Math.round(80 + Math.random() * 18),
        db: Math.round(30 + Math.random() * 40),
      });
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
  const item = {
    hidden: { opacity: 0, y: 28, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, damping: 20, stiffness: 220 } },
  };

  const glassCard = {
    background: "rgba(2,15,8,0.8)",
    border: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(20px)",
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: "linear-gradient(135deg, #010d06 0%, #020f08 40%, #041208 100%)" }}>
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div className="absolute w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(0,255,135,0.07) 0%, transparent 70%)", top: "-10%", left: "-10%" }} animate={{ x: [0, 60, 0], y: [0, 40, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)", bottom: "5%", right: "5%" }} animate={{ x: [0, -40, 0], y: [0, -30, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(199,125,255,0.04) 0%, transparent 70%)", top: "45%", left: "45%" }} animate={{ x: [0, 30, -30, 0], y: [0, -20, 20, 0] }} transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }} />
      </div>
      <ParticleField />

      {/* ── SIDEBAR ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-30 flex flex-col w-64 h-full flex-shrink-0"
            style={{ background: "rgba(2,15,8,0.88)", backdropFilter: "blur(24px)", borderRight: "1px solid rgba(0,255,135,0.1)", boxShadow: "4px 0 40px rgba(0,0,0,0.5)" }}
          >
            {/* Logo */}
            <div className="px-6 py-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #00ff87, #00d4ff)" }}
                  animate={{ boxShadow: ["0 0 20px rgba(0,255,135,0.4)", "0 0 35px rgba(0,255,135,0.7)", "0 0 20px rgba(0,255,135,0.4)"] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Leaf size={20} className="text-black" />
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)" }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                  />
                </motion.div>
                <div>
                  <h1 className="text-sm font-black text-white tracking-tight">Krishi-Drishti</h1>
                  <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest">Admin Console</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((navItem, i) => {
                const isActive = activeNav === navItem.id;
                return (
                  <motion.button
                    key={navItem.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setActiveNav(navItem.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left relative group transition-all"
                    style={{ background: isActive ? "rgba(0,255,135,0.1)" : "transparent", border: isActive ? "1px solid rgba(0,255,135,0.2)" : "1px solid transparent" }}
                    whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
                  >
                    {isActive && (
                      <motion.div layoutId="nav-pill" className="absolute left-0 top-1/2 w-1 h-6 rounded-r-full -translate-y-1/2"
                        style={{ background: "linear-gradient(to bottom, #00ff87, #00d4ff)" }} transition={{ type: "spring", damping: 25 }} />
                    )}
                    <navItem.icon size={16} className={isActive ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-300"} style={isActive ? { filter: "drop-shadow(0 0 6px #00ff87)" } : {}} />
                    <span className={`text-[13px] font-semibold ${isActive ? "text-emerald-300" : "text-gray-500 group-hover:text-gray-300"}`}>{navItem.label}</span>
                    {isActive && <motion.div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />}
                  </motion.button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center gap-3 px-3 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-black text-black">KD</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">Super Admin</p>
                  <p className="text-[10px] text-gray-500 truncate">admin@krishi.ai</p>
                </div>
                <motion.button whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }}>
                  <LogOut size={14} className="text-gray-500 hover:text-red-400" />
                </motion.button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <motion.header
          initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 20 }}
          className="relative z-20 flex items-center gap-4 px-6 py-4"
          style={{ background: "rgba(2,11,6,0.7)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,255,135,0.08)" }}
        >
          <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} onClick={() => setSidebarOpen(v => !v)}
            className="p-2.5 rounded-xl text-gray-400 hover:text-emerald-400"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </motion.button>

          <div className="flex-1 max-w-md flex items-center gap-3 px-4 py-2.5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,255,135,0.1)" }}>
            <Search size={15} className="text-emerald-400/60" />
            <input value={searchText} onChange={e => setSearchText(e.target.value)}
              placeholder="Search farmers, crops, districts..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 outline-none font-medium" />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(0,255,135,0.05)", border: "1px solid rgba(0,255,135,0.1)" }}>
              <motion.div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
              <span className="text-[11px] font-black text-emerald-400 tabular-nums">
                {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative p-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              onClick={() => setNotifications(0)}>
              <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                <Bell size={18} className="text-gray-300" />
              </motion.div>
              {notifications > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center"
                  style={{ background: "linear-gradient(to right, #ff6b6b, #ff9f43)" }}>
                  {notifications}
                </motion.span>
              )}
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="p-2.5 rounded-xl text-gray-400 hover:text-emerald-400"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <RefreshCw size={16} />
            </motion.button>
          </div>
        </motion.header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <motion.div variants={container} initial="hidden" animate="show">

            {/* Title row */}
            <motion.div variants={item} className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  Mission Control
                  <motion.span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ background: "rgba(0,255,135,0.1)", color: "#00ff87", border: "1px solid rgba(0,255,135,0.2)" }}
                    animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    LIVE
                  </motion.span>
                </h2>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  {now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black text-black"
                style={{ background: "linear-gradient(135deg, #00ff87, #00d4ff)", boxShadow: "0 0 20px rgba(0,255,135,0.3)" }}>
                <Sparkles size={14} /> Generate Report
              </motion.button>
            </motion.div>

            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((m, idx) => (
                <motion.div key={m.id} variants={item} custom={idx}>
                  <TiltCard className="group cursor-default h-full">
                    <div className="relative p-5 rounded-3xl overflow-hidden h-full flex flex-col justify-between"
                      style={{ background: m.bg, border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", boxShadow: `0 8px 32px ${m.glow}` }}>
                      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-25 group-hover:opacity-50 transition-opacity" style={{ background: m.color }} />
                      <div className="relative flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">{m.label}</p>
                          <p className="text-2xl font-black text-white">{m.value}</p>
                        </div>
                        <motion.div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                          style={{ background: `${m.color}20`, boxShadow: `0 4px 14px ${m.glow}` }}
                          whileHover={{ scale: 1.15 }}>
                          <m.icon size={18} style={{ color: m.color }} />
                        </motion.div>
                      </div>
                      <div className="relative flex items-center gap-2 mt-3">
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-black ${m.up ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>
                          {m.up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{m.delta}
                        </span>
                        <span className="text-[10px] text-gray-500">vs last month</span>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Area chart */}
              <motion.div variants={item} className="lg:col-span-2">
                <div className="p-6 rounded-3xl h-full" style={{ ...glassCard, border: "1px solid rgba(0,255,135,0.08)" }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-base font-black text-white">Platform Analytics</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">Farmers · Revenue · Health</p>
                    </div>
                    <div className="flex gap-2">
                      {["1M", "3M", "1Y"].map((p, i) => (
                        <motion.button key={p} whileTap={{ scale: 0.9 }}
                          className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase ${i === 2 ? "text-black" : "text-gray-500"}`}
                          style={i === 2 ? { background: "linear-gradient(135deg, #00ff87, #00d4ff)" } : { background: "rgba(255,255,255,0.04)" }}>
                          {p}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={areaData}>
                      <defs>
                        <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00ff87" stopOpacity={0.3} /><stop offset="95%" stopColor="#00ff87" stopOpacity={0} /></linearGradient>
                        <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#00d4ff" stopOpacity={0} /></linearGradient>
                        <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#c77dff" stopOpacity={0.2} /><stop offset="95%" stopColor="#c77dff" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" tick={{ fill: "#4b5563", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<GlowTooltip />} />
                      <Area type="monotone" dataKey="users" stroke="#00ff87" strokeWidth={2} fill="url(#gU)" name="Farmers" />
                      <Area type="monotone" dataKey="revenue" stroke="#00d4ff" strokeWidth={2} fill="url(#gR)" name="Revenue" />
                      <Area type="monotone" dataKey="health" stroke="#c77dff" strokeWidth={2} fill="url(#gH)" name="Health" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Globe + Vitals */}
              <motion.div variants={item} className="flex flex-col gap-4">
                <TiltCard>
                  <div className="p-5 rounded-3xl flex flex-col items-center" style={{ ...glassCard, border: "1px solid rgba(0,212,255,0.1)" }}>
                    <div className="flex items-center justify-between w-full mb-4">
                      <div>
                        <h3 className="text-sm font-black text-white">Coverage Map</h3>
                        <p className="text-[10px] text-gray-500">18 States Active</p>
                      </div>
                      <motion.div className="w-2 h-2 bg-emerald-400 rounded-full"
                        animate={{ scale: [1, 2, 1], opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                    </div>
                    <OrbitGlobe />
                    <p className="text-[10px] text-gray-500 mt-3 font-semibold">12,847 active sensors</p>
                  </div>
                </TiltCard>

                <div className="p-5 rounded-3xl" style={glassCard}>
                  <div className="flex items-center gap-2 mb-4">
                    <Cpu size={14} className="text-cyan-400" />
                    <h3 className="text-sm font-black text-white">Server Vitals</h3>
                    <motion.span className="ml-auto text-[9px] font-black uppercase text-cyan-400 tracking-widest"
                      animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>LIVE</motion.span>
                  </div>
                  <LivePulseBar label="CPU" value={pulse.cpu} color="#00ff87" />
                  <LivePulseBar label="RAM" value={pulse.ram} color="#00d4ff" />
                  <LivePulseBar label="Gemini API" value={pulse.api} color="#c77dff" />
                  <LivePulseBar label="Database" value={pulse.db} color="#ffd93d" />
                </div>
              </motion.div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Bar chart */}
              <motion.div variants={item}>
                <div className="p-6 rounded-3xl h-full" style={glassCard}>
                  <h3 className="text-sm font-black text-white mb-1">Top States</h3>
                  <p className="text-[10px] text-gray-500 mb-4">Farmer registrations</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={distBarData} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="state" tick={{ fill: "#4b5563", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<GlowTooltip />} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Farmers">
                        {distBarData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Radar */}
              <motion.div variants={item}>
                <TiltCard className="h-full">
                  <div className="p-6 rounded-3xl h-full" style={{ ...glassCard, border: "1px solid rgba(199,125,255,0.1)" }}>
                    <h3 className="text-sm font-black text-white mb-1">AI Performance</h3>
                    <p className="text-[10px] text-gray-500 mb-3">Multi-axis metrics</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(199,125,255,0.15)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: "#6b7280", fontSize: 9, fontWeight: 700 }} />
                        <PolarRadiusAxis tick={{ fill: "#374151", fontSize: 8 }} domain={[0, 100]} />
                        <Radar dataKey="value" stroke="#c77dff" fill="#c77dff" fillOpacity={0.15} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </TiltCard>
              </motion.div>

              {/* Activity feed */}
              <motion.div variants={item}>
                <div className="p-5 rounded-3xl h-full" style={glassCard}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-white">Live Activity</h3>
                    <motion.div className="w-2 h-2 bg-red-400 rounded-full"
                      animate={{ scale: [1, 1.8, 1], opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                  </div>
                  <div className="space-y-2.5">
                    {activities.map((act, i) => {
                      const cm: Record<string, any> = {
                        alert: { bg: "rgba(255,107,107,0.08)", bd: "rgba(255,107,107,0.15)", ic: "#ff6b6b" },
                        success: { bg: "rgba(0,255,135,0.06)", bd: "rgba(0,255,135,0.12)", ic: "#00ff87" },
                        info: { bg: "rgba(0,212,255,0.06)", bd: "rgba(0,212,255,0.12)", ic: "#00d4ff" },
                      };
                      const c = cm[act.status];
                      return (
                        <motion.div key={act.id}
                          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07, type: "spring", damping: 20 }}
                          className="flex items-start gap-3 p-3 rounded-2xl"
                          style={{ background: c.bg, border: `1px solid ${c.bd}` }}>
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${c.ic}15` }}>
                            <act.icon size={12} style={{ color: c.ic }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">{act.user}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{act.action}</p>
                          </div>
                          <span className="text-[9px] text-gray-600 font-semibold flex-shrink-0 pt-0.5">{act.time}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Quick stats counters */}
            <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Diagnoses Today", value: 2847, icon: Microscope, color: "#00ff87" },
                { label: "Carbon Credits", value: 4821, icon: Leaf, color: "#c77dff", suffix: " tCO2" },
                { label: "Market Trades", value: 194, icon: TrendingUp, color: "#ffd93d" },
                { label: "AI Responses", value: 12450, icon: Bot, color: "#00d4ff" },
              ].map((s, i) => (
                <motion.div key={i} whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="p-5 rounded-3xl flex items-center gap-4"
                  style={{ ...glassCard, boxShadow: `0 4px 20px ${s.color}10` }}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                    <s.icon size={16} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{s.label}</p>
                    <p className="text-xl font-black text-white tabular-nums">
                      <AnimatedCounter end={s.value} suffix={s.suffix} />
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
