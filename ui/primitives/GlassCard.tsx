import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { widgetRise } from "../animations/variants";

export interface GlassCardProps {
  title?: string;
  subtitle?: string;
  accent?: "emerald" | "harvest" | "sunset" | "deepsky";
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
  delay?: number;
}

const ACCENT = {
  emerald: "from-emerald-500/30 to-emerald-700/5 shadow-glow border-emerald-400/25",
  harvest: "from-harvest-500/30 to-harvest-700/5 shadow-glow-gold border-harvest-400/25",
  sunset:  "from-sunset-500/30 to-sunset-700/5 border-sunset-400/25",
  deepsky: "from-deepsky-500/30 to-deepsky-800/5 border-deepsky-400/25",
} as const;

/** Frosted glass widget shell with gradient rim + hover lift. */
export default function GlassCard({
  title, subtitle, accent = "emerald", icon, action,
  className = "", children, delay = 0,
}: GlassCardProps) {
  return (
    <motion.section
      variants={widgetRise}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay }}
      whileHover={{ y: -6, scale: 1.012 }}
      className={`glass glass-hover relative overflow-hidden p-5 ${className}`}
    >
      {/* gradient rim glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60 ${ACCENT[accent]}`}
      />
      <div className="relative">
        {(title || action) && (
          <header className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {icon && (
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-emerald-300 ring-1 ring-white/15">
                  {icon}
                </span>
              )}
              <div>
                {title && <h3 className="font-display text-lg font-bold text-white">{title}</h3>}
                {subtitle && <p className="text-xs text-emerald-100/60">{subtitle}</p>}
              </div>
            </div>
            {action}
          </header>
        )}
        {children}
      </div>
    </motion.section>
  );
}
