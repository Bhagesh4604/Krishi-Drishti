import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sprout, Droplet, Bug, Coins } from "lucide-react";
import type { ReactNode } from "react";
import { staggerContainer, staggerItem, pageVariants } from "./animations/variants";
import WeatherWidget, { type WeatherSnapshot } from "./widgets/WeatherWidget";
import BioacousticWidget from "./widgets/BioacousticWidget";
import { PestTrendChart, CropHealthChart, VitalityGauge, type PestPoint, type HealthPoint } from "./widgets/AnalyticsCharts";
import { WidgetSkeleton } from "./primitives/Skeleton";

/* ── Demo data — replace with fetch() to your Flask endpoints ─────── */
const DEMO_WEATHER: WeatherSnapshot = { tempC: 27, humidity: 64, windKph: 12, sky: "drizzle", label: "Light drizzle · good for cotton sowing" };
const DEMO_PESTS: PestPoint[] = [
  { day: "Mon", pests: 34, detected: 8 }, { day: "Tue", pests: 41, detected: 12 },
  { day: "Wed", pests: 29, detected: 6 }, { day: "Thu", pests: 55, detected: 19 },
  { day: "Fri", pests: 62, detected: 24 }, { day: "Sat", pests: 47, detected: 15 },
  { day: "Sun", pests: 38, detected: 9 },
];
const DEMO_HEALTH: HealthPoint[] = [
  { crop: "Cotton", health: 82 }, { crop: "Soybean", health: 67 },
  { crop: "Wheat", health: 91 }, { crop: "Maize", health: 74 }, { crop: "Chilli", health: 58 },
];

interface Kpi { label: string; value: string; delta: string; icon: ReactNode; grad: string }

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherSnapshot | undefined>(undefined);

  useEffect(() => {
    // Simulated API latency — swap with real fetch('/api/weather') etc.
    const t = setTimeout(() => { setWeather(DEMO_WEATHER); setLoading(false); }, 900);
    return () => clearTimeout(t);
  }, []);

  const kpis: Kpi[] = [
    { label: "Active Alerts",   value: "4",     delta: "+2 today",   icon: <Bug size={18} />,      grad: "from-sunset-600 to-sunset-400" },
    { label: "Soil Moisture",   value: "61%",   delta: "optimal",    icon: <Droplet size={18} />,  grad: "from-deepsky-600 to-deepsky-400" },
    { label: "Fields Healthy",  value: "12/14", delta: "93% NDVI",   icon: <Sprout size={18} />,   grad: "from-emerald-600 to-emerald-400" },
    { label: "Carbon Credits",  value: "₹8.2k", delta: "+₹1.1k/wk",  icon: <Coins size={18} />,    grad: "from-harvest-600 to-harvest-400" },
  ];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
      {/* Greeting */}
      <div>
        <h2 className="font-display text-2xl font-black text-white md:text-3xl">
          Namaste, <span className="text-gradient-field">Ramesh</span> 🌾
        </h2>
        <p className="text-sm text-emerald-100/60">Shivapuri village · Kolar district — here is your farm pulse today.</p>
      </div>

      {/* KPI strip — staggered reveal */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <motion.div key={k.label} variants={staggerItem} whileHover={{ scale: 1.04, y: -3 }}
            className="glass glass-hover flex items-center gap-3 !rounded-2xl p-4">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${k.grad} text-white shadow-lg`}>
              {k.icon}
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl font-black leading-tight text-white">{k.value}</p>
              <p className="truncate text-[11px] text-emerald-100/60">{k.label} · <span className="text-harvest-300">{k.delta}</span></p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* High-density widget grid */}
      {loading ? (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-4"><WidgetSkeleton /></div>
          <div className="lg:col-span-4"><WidgetSkeleton /></div>
          <div className="lg:col-span-4"><WidgetSkeleton /></div>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-4">
            <WeatherWidget data={weather} />
            <VitalityGauge value={86} label="Overall vitality" />
          </div>
          <div className="space-y-5 lg:col-span-8">
            <PestTrendChart data={DEMO_PESTS} />
            <div className="grid gap-5 xl:grid-cols-2">
              <CropHealthChart data={DEMO_HEALTH} />
              <BioacousticWidget />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
