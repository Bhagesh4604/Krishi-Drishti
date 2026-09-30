import { useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, CloudSun, Bug, BarChart3, MessageSquare, User,
  Sprout, PanelLeftClose, PanelLeftOpen, Bell, Plus, ChevronRight,
} from "lucide-react";
import { sidebarVariants, fabVariants, staggerContainer, staggerItem } from "./animations/variants";

export interface NavItem { id: string; label: string; icon: ReactNode }

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard",   icon: <LayoutDashboard size={20} /> },
  { id: "weather",   label: "Weather",     icon: <CloudSun size={20} /> },
  { id: "pests",     label: "Pest Scan",   icon: <Bug size={20} /> },
  { id: "analytics", label: "Analytics",   icon: <BarChart3 size={20} /> },
  { id: "expert",    label: "Expert Chat", icon: <MessageSquare size={20} /> },
  { id: "profile",   label: "Profile",     icon: <User size={20} /> },
];

interface AppLayoutProps {
  active: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
}

/** Desktop: collapsible glass sidebar · Mobile: floating bottom bar + FAB. */
export default function AppLayout({ active, onNavigate, children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar (md+) ─────────────────────────────────────────── */}
      <motion.aside
        variants={sidebarVariants} initial={false}
        animate={collapsed ? "collapsed" : "expanded"}
        className="sticky top-0 z-40 hidden h-screen overflow-hidden border-r border-white/10 bg-night-800/70 backdrop-blur-2xl md:block"
      >
        <div className="flex h-full flex-col p-3">
          <motion.div className="mb-6 flex items-center gap-3 px-2 pt-2" whileHover={{ scale: 1.03 }}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-aurora-green text-white shadow-glow">
              <Sprout size={22} />
            </span>
            <AnimatePresence>
              {!collapsed && (
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                  <p className="font-display text-lg font-black leading-none text-gradient-field">Krishi-Drishti</p>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-200/50">Farm Intelligence</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <nav className="flex-1 space-y-1">
            {NAV.map((item) => {
              const isActive = item.id === active;
              return (
                <motion.button
                  key={item.id} onClick={() => onNavigate(item.id)} whileHover={{ x: 4 }}
                  className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors
                    ${isActive ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30" : "text-emerald-100/60 hover:bg-white/5 hover:text-white"}`}
                >
                  {isActive && (
                    <motion.span layoutId="active-pill" className="absolute inset-0 -z-10 rounded-2xl bg-aurora-green opacity-20" />
                  )}
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
                  {!collapsed && <ChevronRight size={14} className="opacity-0 transition-opacity group-hover:opacity-60" />}
                </motion.button>
              );
            })}
          </nav>

          <button onClick={() => setCollapsed((c) => !c)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 py-2.5 text-xs text-emerald-200/70 hover:bg-white/10">
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </motion.aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-night-900/60 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-aurora-green text-white"><Sprout size={18} /></span>
            <p className="font-display font-black text-gradient-field">Krishi-Drishti</p>
          </div>
          <h1 className="hidden font-display text-xl font-bold capitalize text-white md:block">{active}</h1>
          <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.08 }}
            className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white/5 text-emerald-200 ring-1 ring-white/10">
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-sunset-500" />
            <span className="absolute right-2 top-2 h-2 w-2 animate-pulse-ring rounded-full bg-sunset-500" />
          </motion.button>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10">{children}</main>
      </div>

      {/* ── FAB (mobile) ──────────────────────────────────────────── */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col-reverse items-center gap-3 md:hidden">
        <AnimatePresence>
          {fabOpen && ["Scan Field", "Upload .wav", "Ask Expert"].map((label, i) => (
            <motion.button key={label}
              initial={{ opacity: 0, y: 16, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.6 }} transition={{ delay: i * 0.05 }}
              onClick={() => setFabOpen(false)}
              className="glass rounded-full px-4 py-2 text-xs font-bold text-emerald-200">
              {label}
            </motion.button>
          ))}
        </AnimatePresence>
        <motion.button variants={fabVariants} initial="hidden" animate="show"
          onClick={() => setFabOpen((o) => !o)} whileTap={{ rotate: 45 }}
          className="grid h-14 w-14 place-items-center rounded-full bg-harvest-glow text-night-900 shadow-glow-gold">
          <Plus size={26} strokeWidth={3} />
        </motion.button>
      </div>

      {/* ── Bottom nav (mobile) ───────────────────────────────────── */}
      <motion.nav
        initial={{ y: 80 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 140, damping: 18 }}
        className="fixed inset-x-3 bottom-3 z-40 md:hidden">
        <motion.ul variants={staggerContainer} initial="hidden" animate="show"
          className="glass mx-auto flex max-w-md items-center justify-around !rounded-3xl px-2 py-2">
          {NAV.slice(0, 5).map((item) => {
            const isActive = item.id === active;
            return (
              <motion.li key={item.id} variants={staggerItem}>
                <button onClick={() => onNavigate(item.id)}
                  className={`relative flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] font-semibold transition-colors
                    ${isActive ? "text-emerald-300" : "text-emerald-100/50"}`}>
                  {isActive && (
                    <motion.span layoutId="active-tab" className="absolute inset-0 -z-10 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/30" />
                  )}
                  {item.icon}
                  {item.label.split(" ")[0]}
                </button>
              </motion.li>
            );
          })}
        </motion.ul>
      </motion.nav>
    </div>
  );
}
