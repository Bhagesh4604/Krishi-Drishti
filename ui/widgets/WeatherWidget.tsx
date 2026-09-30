import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Cloud, CloudRain, Sunrise, Sunset, Wind, Droplets, Thermometer } from "lucide-react";
import GlassCard from "../primitives/GlassCard";

export type SkyKind = "cloudy" | "drizzle" | "sunrise" | "sunset" | "clear" | "storm";

export interface WeatherSnapshot {
  tempC: number; humidity: number; windKph: number; sky: SkyKind; label: string;
}

const ICONS: Record<SkyKind, ReactNode> = {
  cloudy:  <Cloud size={40} className="text-deepsky-200" />,
  drizzle: <CloudRain size={40} className="text-deepsky-400" />,
  sunrise: <Sunrise size={40} className="text-harvest-400" />,
  sunset:  <Sunset size={40} className="text-sunset-500" />,
  clear:   <Sunrise size={40} className="text-harvest-300" />,
  storm:   <CloudRain size={40} className="text-sunset-300" />,
};

const FORECAST_BG: Record<SkyKind, string> = {
  cloudy:  "from-deepsky-800/70 via-night-800 to-night-900",
  drizzle: "from-deepsky-600/60 via-night-800 to-night-900",
  sunrise: "from-harvest-600/60 via-sunset-700/30 to-night-900",
  sunset:  "from-sunset-600/60 via-harvest-700/25 to-night-900",
  clear:   "from-emerald-600/50 via-deepsky-800/40 to-night-900",
  storm:   "from-soil-700/50 via-night-800 to-night-950",
};

interface Props { data?: WeatherSnapshot }

export default function WeatherWidget({ data }: Props) {
  if (!data) return <div className="glass p-5"><div className="skeleton h-40 w-full" /></div>;
  return (
    <GlassCard title="Live Weather" subtitle="Field micro-climate · updated just now" accent="deepsky">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 ${FORECAST_BG[data.sky]}`}>
        {/* drifting cloud blobs */}
        <motion.div aria-hidden className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10 blur-xl"
          animate={{ x: [0, 18, 0], y: [0, -6, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="font-display text-5xl font-black text-white">
              {data.tempC}<span className="align-top text-2xl">°C</span>
            </p>
            <p className="mt-1 text-sm text-white/80">{data.label}</p>
          </div>
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
            {ICONS[data.sky]}
          </motion.div>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {[
            { icon: <Droplets size={15} />, label: "Humidity", value: `${data.humidity}%` },
            { icon: <Wind size={15} />, label: "Wind", value: `${data.windKph} km/h` },
            { icon: <Thermometer size={15} />, label: "Sky", value: data.sky },
          ].map((m) => (
            <div key={m.label} className="rounded-xl bg-black/25 px-3 py-2 backdrop-blur-md ring-1 ring-white/10">
              <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/60">
                {m.icon}{m.label}
              </span>
              <p className="mt-0.5 truncate text-sm font-semibold capitalize text-white">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
