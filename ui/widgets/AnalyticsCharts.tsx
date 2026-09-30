import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { TrendingUp, Leaf } from "lucide-react";
import GlassCard from "../primitives/GlassCard";

export interface PestPoint   { day: string; pests: number; detected: number }
export interface HealthPoint { crop: string; health: number }

const tooltipStyle = {
  background: "rgba(7,19,14,.92)", border: "1px solid rgba(110,231,183,.25)",
  borderRadius: 16, color: "#ECFDF5", fontSize: 12, backdropFilter: "blur(8px)",
} as const;

/** Historical pest-pressure trend (area) + detection counts. */
export function PestTrendChart({ data }: { data: PestPoint[] }) {
  return (
    <GlassCard title="Pest Pressure Trend" subtitle="Last 14 days · bioacoustic + vision fusion" accent="sunset"
      icon={<TrendingUp size={18} />}>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: -18, right: 6, top: 6 }}>
            <defs>
              <linearGradient id="gPest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gDet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,.07)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "rgba(236,253,245,.55)", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "rgba(236,253,245,.55)", fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#D1FAE5" }} />
            <Area type="monotone" dataKey="pests" name="Pest calls" stroke="#FB923C" strokeWidth={2.5} fill="url(#gPest)" />
            <Area type="monotone" dataKey="detected" name="Confirmed detections" stroke="#34D399" strokeWidth={2.5} fill="url(#gDet)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

/** Per-crop health bars. */
export function CropHealthChart({ data }: { data: HealthPoint[] }) {
  return (
    <GlassCard title="Crop Health Index" subtitle="NDVI + stress model composite score" accent="emerald"
      icon={<Leaf size={18} />}>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: -18, right: 6, top: 6 }}>
            <defs>
              <linearGradient id="gHealth" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#047857" />
                <stop offset="60%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,.07)" vertical={false} />
            <XAxis dataKey="crop" tick={{ fill: "rgba(236,253,245,.55)", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: "rgba(236,253,245,.55)", fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,.05)" }} />
            <Bar dataKey="health" name="Health %" radius={[8, 8, 0, 0]} fill="url(#gHealth)" maxBarSize={38} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

/** Single radial KPI gauge (e.g. farm vitality). */
export function VitalityGauge({ value, label }: { value: number; label: string }) {
  return (
    <GlassCard title="Farm Vitality" accent="deepsky" className="!min-h-[220px]">
      <div className="relative h-40">
        <ResponsiveContainer>
          <RadialBarChart innerRadius="72%" outerRadius="100%" barSize={14}
            data={[{ name: label, value, fill: "url(#gVital)" }]} startAngle={220} endAngle={-40}>
            <defs>
              <linearGradient id="gVital" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background={{ fill: "rgba(255,255,255,.06)" }} dataKey="value" cornerRadius={12} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="font-display text-4xl font-black text-gradient-field">{value}</p>
        </div>
      </div>
      <p className="-mt-4 text-center text-xs uppercase tracking-widest text-white/50">{label}</p>
    </GlassCard>
  );
}
