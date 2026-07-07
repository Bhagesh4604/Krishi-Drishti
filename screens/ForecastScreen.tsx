import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Screen, UserProfile } from '../types';
import { ArrowLeft, Wind, Droplets, Eye, Gauge, Thermometer, Sun, MapPin, List } from 'lucide-react';

interface ForecastScreenProps {
  navigateTo: (screen: Screen) => void;
  t: any;
  weather?: any;
  user?: UserProfile | null;
  locationName?: string;
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── WMO code helpers ────────────────────────────────────────────────────────
const getCondition = (code: number, isDay = 1) => {
  if (code === 0) return isDay ? { label: 'Clear', icon: '☀️', type: 'clear-day' } : { label: 'Clear Night', icon: '🌙', type: 'clear-night' };
  if (code <= 2) return isDay ? { label: 'Partly Cloudy', icon: '⛅', type: 'partly-cloudy-day' } : { label: 'Partly Cloudy', icon: '🌙', type: 'partly-cloudy-night' };
  if (code === 3) return { label: 'Overcast', icon: '☁️', type: 'cloudy' };
  if (code <= 48) return { label: 'Foggy', icon: '🌫️', type: 'fog' };
  if (code <= 57) return { label: 'Drizzle', icon: '🌦️', type: 'drizzle' };
  if (code <= 67) return { label: 'Rain', icon: '🌧️', type: 'rain' };
  if (code <= 77) return { label: 'Snow', icon: '❄️', type: 'snow' };
  if (code <= 82) return { label: 'Showers', icon: '🌦️', type: 'rain' };
  if (code <= 99) return { label: 'Thunderstorm', icon: '⛈️', type: 'thunder' };
  return { label: 'Unknown', icon: '🌡️', type: 'cloudy' };
};

const getHourIcon = (code: number) => {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 99) return '⛈️';
  return '🌡️';
};

const getWindDir = (deg: number) => {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
};

const getUVInfo = (uv: number) => {
  if (uv <= 2) return { label: 'Low', tip: 'No protection needed.' };
  if (uv <= 5) return { label: 'Moderate', tip: 'Use sun protection until 4PM.' };
  if (uv <= 7) return { label: 'High', tip: 'Seek shade during peak hours.' };
  if (uv <= 10) return { label: 'Very High', tip: 'Avoid sun 10AM–4PM.' };
  return { label: 'Extreme', tip: 'Stay indoors during peak sun.' };
};

// ─── Background gradients per weather type ─────────────────────────────────
const getBgGradient = (type: string) => {
  switch (type) {
    case 'clear-day':         return 'linear-gradient(170deg, #1a6eb5 0%, #4a9fd4 25%, #74bde0 55%, #a8d8ea 80%, #c8e8f4 100%)';
    case 'partly-cloudy-day': return 'linear-gradient(170deg, #2a7dbf 0%, #5498cc 30%, #7ab5d5 60%, #a0cde0 100%)';
    case 'cloudy':            return 'linear-gradient(170deg, #4a6577 0%, #6a8898 35%, #86a5b5 65%, #a2bfcc 100%)';
    case 'drizzle':           return 'linear-gradient(170deg, #3a5a6e 0%, #4e7888 35%, #62929e 65%, #78a8b5 100%)';
    case 'rain':              return 'linear-gradient(170deg, #1e3d50 0%, #2e5568 30%, #3e6e82 60%, #4e8296 100%)';
    case 'snow':              return 'linear-gradient(170deg, #5a7080 0%, #7a9aaa 35%, #9abaca 65%, #bad0dc 100%)';
    case 'thunder':           return 'linear-gradient(170deg, #0e1e2a 0%, #1a2e3e 30%, #283c4e 60%, #34505e 100%)';
    case 'fog':               return 'linear-gradient(170deg, #5a6e78 0%, #788a94 35%, #90a4ae 65%, #aabfc8 100%)';
    case 'clear-night':       return 'linear-gradient(170deg, #050e1a 0%, #0a1828 30%, #102038 60%, #162840 100%)';
    case 'partly-cloudy-night':return 'linear-gradient(170deg, #0a1520 0%, #121e2e 30%, #1a2a3e 60%, #22364e 100%)';
    default:                  return 'linear-gradient(170deg, #2a7dbf 0%, #74bde0 50%, #a8d8ea 100%)';
  }
};

// ═══════════════════════════════════════════════════════════
//  WEATHER CANVAS — animated rain / snow / thunder / clouds
// ═══════════════════════════════════════════════════════════
const WeatherCanvas: React.FC<{ type: string; isDay: number }> = ({ type, isDay }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let animId: number;
    let lightningTimer = 0;
    let lightningAlpha = 0;

    // ── Rain drops ──
    interface Drop { x: number; y: number; speed: number; len: number; op: number; }
    const drops: Drop[] = [];
    const count = type === 'thunder' ? 220 : type === 'rain' ? 150 : 70;
    if (['rain', 'drizzle', 'thunder'].includes(type)) {
      for (let i = 0; i < count; i++) {
        drops.push({
          x: Math.random() * (canvas.width + 200) - 100,
          y: Math.random() * canvas.height,
          speed: type === 'thunder' ? 14 + Math.random() * 8 : type === 'rain' ? 10 + Math.random() * 6 : 4 + Math.random() * 3,
          len: type === 'thunder' ? 25 + Math.random() * 20 : type === 'rain' ? 18 + Math.random() * 14 : 10 + Math.random() * 8,
          op: 0.15 + Math.random() * 0.35,
        });
      }
    }

    // ── Snowflakes ──
    interface Flake { x: number; y: number; r: number; speed: number; drift: number; op: number; angle: number; }
    const flakes: Flake[] = [];
    if (type === 'snow') {
      for (let i = 0; i < 100; i++) {
        flakes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: 1.5 + Math.random() * 3.5,
          speed: 0.8 + Math.random() * 1.8,
          drift: (Math.random() - 0.5) * 0.6,
          op: 0.5 + Math.random() * 0.5,
          angle: Math.random() * Math.PI * 2,
        });
      }
    }

    // ── Cloud puffs (clear / partly-cloudy) ──
    interface Cloud { x: number; y: number; w: number; h: number; speed: number; op: number; }
    const clouds: Cloud[] = [];
    if (['clear-day', 'clear-night', 'partly-cloudy-day', 'partly-cloudy-night', 'cloudy', 'fog'].includes(type)) {
      const n = type === 'cloudy' ? 6 : type === 'fog' ? 8 : 4;
      for (let i = 0; i < n; i++) {
        clouds.push({
          x: Math.random() * canvas.width,
          y: 20 + Math.random() * canvas.height * 0.55,
          w: 120 + Math.random() * 200,
          h: 40 + Math.random() * 70,
          speed: 0.15 + Math.random() * 0.25,
          op: type === 'fog' ? 0.12 + Math.random() * 0.18 : 0.08 + Math.random() * 0.14,
        });
      }
    }

    // ── Stars (night) ──
    interface Star { x: number; y: number; r: number; twinkle: number; phase: number; }
    const stars: Star[] = [];
    if (['clear-night', 'partly-cloudy-night'].includes(type)) {
      for (let i = 0; i < 120; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.7,
          r: 0.5 + Math.random() * 1.5,
          twinkle: 0.003 + Math.random() * 0.006,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // Stars
      stars.forEach(s => {
        s.phase += s.twinkle;
        const op = 0.4 + 0.6 * Math.abs(Math.sin(s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op})`;
        ctx.fill();
      });

      // Clouds
      clouds.forEach(c => {
        c.x += c.speed;
        if (c.x > canvas.width + c.w) c.x = -c.w;
        const grd = ctx.createRadialGradient(c.x + c.w / 2, c.y + c.h / 2, 0, c.x + c.w / 2, c.y + c.h / 2, c.w / 1.5);
        grd.addColorStop(0, `rgba(255,255,255,${c.op})`);
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(c.x, c.y, c.w, c.h);
      });

      // Sun halo (clear day)
      if (type === 'clear-day' && frame % 2 === 0) {
        const cx = canvas.width * 0.7, cy = canvas.height * 0.12;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
        grd.addColorStop(0, 'rgba(255,240,180,0.35)');
        grd.addColorStop(0.4, 'rgba(255,220,120,0.12)');
        grd.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Moon (clear night)
      if (type === 'clear-night') {
        const mx = canvas.width * 0.75, my = canvas.height * 0.12;
        const mgrd = ctx.createRadialGradient(mx, my, 0, mx, my, 80);
        mgrd.addColorStop(0, 'rgba(200,210,255,0.12)');
        mgrd.addColorStop(1, 'rgba(200,210,255,0)');
        ctx.fillStyle = mgrd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Rain drops
      drops.forEach(d => {
        ctx.beginPath();
        const angle = type === 'thunder' ? 0.12 : 0.07;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * angle, d.y + d.len);
        ctx.strokeStyle = `rgba(180,215,235,${d.op})`;
        ctx.lineWidth = type === 'thunder' ? 1.5 : 1;
        ctx.stroke();
        d.y += d.speed;
        d.x -= d.speed * (type === 'thunder' ? 0.12 : 0.07);
        if (d.y > canvas.height) {
          d.y = -d.len - Math.random() * 40;
          d.x = Math.random() * (canvas.width + 100);
        }
      });

      // Lightning
      if (type === 'thunder') {
        lightningTimer++;
        if (lightningTimer > 140 && lightningTimer < 145) {
          lightningAlpha = (145 - lightningTimer) * 0.07;
          ctx.fillStyle = `rgba(200,220,255,${lightningAlpha})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw lightning bolt
          if (lightningTimer === 141) {
            const lx = 80 + Math.random() * (canvas.width - 160);
            ctx.beginPath();
            ctx.moveTo(lx, 0);
            ctx.lineTo(lx - 20 + Math.random() * 40, canvas.height * 0.3);
            ctx.lineTo(lx + 20 + Math.random() * 20, canvas.height * 0.3);
            ctx.lineTo(lx - 10 + Math.random() * 30, canvas.height * 0.6);
            ctx.strokeStyle = 'rgba(220,230,255,0.9)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        if (lightningTimer > 200 + Math.random() * 100) lightningTimer = 0;
      }

      // Snowflakes
      flakes.forEach(f => {
        f.y += f.speed;
        f.x += f.drift + Math.sin(frame * 0.02 + f.phase) * 0.3;
        f.angle += 0.01;
        if (f.y > canvas.height) { f.y = -10; f.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${f.op})`;
        ctx.fill();
        // Soft glow
        const sg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 3);
        sg.addColorStop(0, `rgba(255,255,255,${f.op * 0.3})`);
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(f.x - f.r * 3, f.y - f.r * 3, f.r * 6, f.r * 6);
      });

      // Fog layers
      if (type === 'fog') {
        const t2 = frame * 0.003;
        for (let i = 0; i < 3; i++) {
          const y = canvas.height * (0.3 + i * 0.2) + Math.sin(t2 + i) * 15;
          const g = ctx.createLinearGradient(0, y - 40, 0, y + 40);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.5, `rgba(255,255,255,${0.06 + i * 0.02})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, y - 40, canvas.width, 80);
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [type, isDay]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};

// ═══════════════════════════════════════════════════════════
//  TRUE LIQUID GLASS CARD
// ═══════════════════════════════════════════════════════════
const Glass: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style = {} }) => (
  <div
    className={`rounded-2xl ${className}`}
    style={{
      background: 'rgba(255,255,255,0.10)',
      backdropFilter: 'blur(40px) saturate(160%)',
      WebkitBackdropFilter: 'blur(40px) saturate(160%)',
      border: '1px solid rgba(255,255,255,0.22)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(255,255,255,0.08)',
      ...style
    }}
  >
    {children}
  </div>
);

// ── Section label ────────────────────────────────────────────────────────────
const Label: React.FC<{ icon?: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.13)' }}>
    {icon && <span className="opacity-70">{icon}</span>}
    <p className="text-[11px] font-bold tracking-widest uppercase text-white" style={{ opacity: 0.65 }}>{text}</p>
  </div>
);

// ── Wind compass SVG ─────────────────────────────────────────────────────────
const WindCompass: React.FC<{ deg: number; speed: number }> = ({ deg, speed }) => (
  <div style={{ width: 110, height: 110 }}>
    <svg width="110" height="110" viewBox="0 0 110 110">
      {Array.from({ length: 36 }).map((_, i) => {
        const a = (i * 10 * Math.PI) / 180;
        const main = i % 9 === 0;
        return (
          <line key={i}
            x1={55 + (main ? 44 : 46) * Math.sin(a)} y1={55 - (main ? 44 : 46) * Math.cos(a)}
            x2={55 + 50 * Math.sin(a)} y2={55 - 50 * Math.cos(a)}
            stroke={`rgba(255,255,255,${main ? 0.55 : 0.25})`} strokeWidth={main ? 2 : 1}
          />
        );
      })}
      {[['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([l, d]) => {
        const r = (Number(d) * Math.PI) / 180;
        return (
          <text key={String(l)} x={55 + 33 * Math.sin(r)} y={55 - 33 * Math.cos(r) + 4}
            textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="9" fontWeight="700">{l}</text>
        );
      })}
      <g transform={`rotate(${deg},55,55)`}>
        <polygon points="55,18 58.5,50 55,53 51.5,50" fill="white" opacity="0.95" />
        <circle cx="55" cy="55" r="3.5" fill="white" />
        <polygon points="55,92 58.5,60 55,57 51.5,60" fill="rgba(255,255,255,0.28)" />
      </g>
      <text x="55" y="52" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">{Math.round(speed)}</text>
      <text x="55" y="63" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8">kph</text>
    </svg>
  </div>
);

// ── Sun Arc SVG ──────────────────────────────────────────────────────────────
const SunArc: React.FC<{ sunrise: string; sunset: string }> = ({ sunrise, sunset }) => {
  const now = Date.now();
  const sr  = new Date(sunrise).getTime();
  const ss  = new Date(sunset).getTime();
  const p   = Math.min(Math.max((now - sr) / (ss - sr), 0), 1);
  const toR = (d: number) => d * Math.PI / 180;
  const cx = 65, cy = 60, r = 44, sa = 210, ea = 330;
  const angle = sa + p * (ea - sa);
  const aR = toR(angle);
  const saR = toR(sa), eaR = toR(ea);
  const sx = cx + r * Math.cos(saR), sy = cy + r * Math.sin(saR);
  const ex = cx + r * Math.cos(eaR), ey = cy + r * Math.sin(eaR);
  const sunX = cx + r * Math.cos(aR), sunY = cy + r * Math.sin(aR);
  return (
    <svg width="130" height="70" viewBox="0 0 130 70">
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" />
      {p > 0 && <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${sunX} ${sunY}`} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" />}
      <circle cx={sunX} cy={sunY} r="5.5" fill="white" />
      <circle cx={sunX} cy={sunY} r="9" fill="rgba(255,255,255,0.25)" />
    </svg>
  );
};

// ── Pressure gauge ───────────────────────────────────────────────────────────
const PressureGauge: React.FC<{ hPa: number }> = ({ hPa }) => {
  const n = Math.min(Math.max((hPa - 980) / 60, 0), 1);
  const toR = (d: number) => d * Math.PI / 180;
  const cx = 55, cy = 58, r = 40;
  const sa = -130, ea = 130;
  const angle = sa + n * (ea - sa);
  const nX = cx + 32 * Math.cos(toR(angle)), nY = cy + 32 * Math.sin(toR(angle));
  const saR = toR(sa), eaR = toR(ea);
  return (
    <svg width="110" height="80" viewBox="0 0 110 80">
      <path d={`M ${cx + r * Math.cos(saR)} ${cy + r * Math.sin(saR)} A ${r} ${r} 0 1 1 ${cx + r * Math.cos(eaR)} ${cy + r * Math.sin(eaR)}`}
        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" strokeLinecap="round" />
      {Array.from({ length: 11 }).map((_, i) => {
        const a = toR(sa + (i / 10) * (ea - sa));
        return <line key={i} x1={cx + 35 * Math.cos(a)} y1={cy + 35 * Math.sin(a)} x2={cx + 42 * Math.cos(a)} y2={cy + 42 * Math.sin(a)} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />;
      })}
      <line x1={cx} y1={cy} x2={nX} y2={nY} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="white" />
      <text x={cx} y={cy - 9} textAnchor="middle" fill="white" fontSize="13" fontWeight="700">{Math.round(hPa).toLocaleString()}</text>
      <text x={cx} y={cy + 1} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="8">hPa</text>
      <text x="12" y="72" fill="rgba(255,255,255,0.5)" fontSize="8">Low</text>
      <text x="88" y="72" fill="rgba(255,255,255,0.5)" fontSize="8">High</text>
    </svg>
  );
};

// ════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════
const ForecastScreen: React.FC<ForecastScreenProps> = ({ navigateTo, weather, locationName }) => {
  const current  = weather?.current;
  const daily    = weather?.daily;
  const hourly   = weather?.hourly;
  const hasForecast = !!current && !!daily;

  // ── Fetch real AQI ───────────────────────────────────
  const [aqiData, setAqiData] = useState<{ aqi: number; label: string; color: string; pm2_5: number; pm10: number } | null>(null);
  useEffect(() => {
    if (!current) return;
    const lat = (weather as any)?.latitude;
    const lng = (weather as any)?.longitude;
    if (!lat || !lng) return;
    // Use same base URL logic as api.ts: native platform → 10.0.2.2, browser → relative
    const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() === true;
    const base = isNative ? 'http://10.0.2.2:8000/api' : '/api';
    fetch(`${base}/weather/airquality?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(d => setAqiData(d))
      .catch(() => {});
  }, [current]);

  const temp      = current ? Math.round(current.temperature_2m)                              : null;
  const feelsLike = current ? Math.round(current.apparent_temperature ?? current.temperature_2m) : null;
  const code      = current?.weather_code ?? 0;
  const isDay     = current?.is_day ?? 1;
  const condition = getCondition(code, isDay);

  const humidity    = current?.relative_humidity_2m ?? '--';
  const windSpeed   = current ? Math.round(current.wind_speed_10m)                           : '--';
  const windDir     = current?.wind_direction_10m ?? 0;
  const pressure    = current?.surface_pressure ?? 1013;
  const visKm       = current ? Math.round((current.visibility ?? 10000) / 1000)             : '--';
  const uvIndex     = current?.uv_index ?? daily?.uv_index_max?.[0] ?? 0;
  const dewPoint    = current ? Math.round(current.dew_point_2m ?? 20)                       : '--';
  const precip      = current?.precipitation ?? 0;
  const windGusts   = daily?.wind_gusts_10m_max?.[0] ?? 0;

  const allMax    = daily?.temperature_2m_max ?? [];
  const allMin    = daily?.temperature_2m_min ?? [];
  const globalMin = Math.min(...allMin.slice(0, 10));
  const globalMax = Math.max(...allMax.slice(0, 10));

  const now = new Date();
  const nowIdx = hourly?.time
    ? hourly.time.findIndex((t: string) => new Date(t) >= now)
    : 0;
  const hStart = nowIdx >= 0 ? nowIdx : 0;
  const hourSlice: string[] = hourly?.time?.slice(hStart, hStart + 24) ?? [];

  const getSummary = () => {
    const gusts = Math.round(windGusts);
    const rainH = hourSlice.findIndex((_: any, i: number) => (hourly?.precipitation_probability?.[hStart + i] ?? 0) >= 40);
    const parts: string[] = [];
    if (rainH >= 0) {
      const h = new Date(hourSlice[rainH]).getHours();
      parts.push(`Rain expected around ${h > 12 ? h - 12 + 'PM' : h + 'AM'}.`);
    }
    if (gusts > 40) parts.push(`Wind gusts up to ${gusts} kph.`);
    if (parts.length === 0) parts.push(`${condition.label} conditions throughout the day.`);
    return parts.join(' ');
  };

  const uvInfo = getUVInfo(uvIndex);
  const bg     = getBgGradient(condition.type);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: bg, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
    >
      {/* ── Animated weather canvas ── */}
      <WeatherCanvas type={condition.type} isDay={isDay} />

      {/* ── Scrollable page ── */}
      <div className="relative overflow-y-auto h-screen pb-32" style={{ scrollbarWidth: 'none', zIndex: 2 }}>

        {/* Back */}
        <button
          onClick={() => navigateTo('home')}
          className="absolute top-12 left-4 z-20 w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <ArrowLeft size={16} color="white" />
        </button>

        {/* ════════ HERO ════════ */}
        <div className="text-center pt-16 pb-8 px-6">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MapPin size={10} color="rgba(255,255,255,0.8)" />
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.82)' }}>My Location</p>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="font-light text-white tracking-tight"
            style={{ fontSize: 38, textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}
          >
            {locationName && !locationName.includes('Locating') ? locationName.split(',')[0] : 'My Location'}
          </motion.h1>

          {temp !== null ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
              className="font-thin text-white"
              style={{ fontSize: 96, lineHeight: 1, textShadow: '0 4px 24px rgba(0,0,0,0.18)', letterSpacing: '-2px', margin: '8px 0' }}
            >
              {temp}°
            </motion.div>
          ) : (
            <div className="my-8 flex justify-center">
              <motion.div
                animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 rounded-full border-4"
                style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: 'white' }}
              />
            </div>
          )}

          <p className="text-xl font-medium text-white" style={{ opacity: 0.9 }}>
            {temp !== null ? condition.label : 'Fetching weather…'}
          </p>
          {temp !== null && (
            <p className="text-[15px] font-medium mt-1" style={{ color: 'rgba(255,255,255,0.78)' }}>
              H:{daily?.temperature_2m_max?.[0] !== undefined ? Math.round(daily.temperature_2m_max[0]) : '--'}°
              &nbsp;&nbsp;L:{daily?.temperature_2m_min?.[0] !== undefined ? Math.round(daily.temperature_2m_min[0]) : '--'}°
            </p>
          )}
        </div>

        <div className="px-4 space-y-3">

          {/* ════════ HOURLY CARD ════════ */}
          {hasForecast && (
            <Glass>
              <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.13)' }}>
                <p className="text-[13px] text-white leading-relaxed" style={{ opacity: 0.88 }}>{getSummary()}</p>
              </div>
              <div className="overflow-x-auto flex py-4 px-2" style={{ scrollbarWidth: 'none' }}>
                {hourSlice.map((ts: string, i: number) => {
                  const hCode = hourly?.weather_code?.[hStart + i] ?? 0;
                  const hTemp = hourly?.temperature_2m?.[hStart + i];
                  const hPrec = hourly?.precipitation_probability?.[hStart + i] ?? 0;
                  const hr    = new Date(ts).getHours();
                  const label = i === 0 ? 'Now' : hr === 0 ? '12AM' : hr < 12 ? `${hr}AM` : hr === 12 ? '12PM' : `${hr - 12}PM`;
                  return (
                    <div key={ts} className="flex flex-col items-center gap-1 min-w-[54px]">
                      <p className="text-[12px] font-semibold text-white" style={{ opacity: i === 0 ? 1 : 0.8 }}>{label}</p>
                      <span className="text-[22px]">{getHourIcon(hCode)}</span>
                      <div style={{ height: 16 }}>
                        {hPrec >= 20 && <p className="text-[11px] font-semibold" style={{ color: '#7DD3F4' }}>{hPrec}%</p>}
                      </div>
                      <p className="text-[13px] font-semibold text-white">{hTemp !== undefined ? Math.round(hTemp) : '--'}°</p>
                    </div>
                  );
                })}
              </div>
            </Glass>
          )}

          {/* ════════ 10-DAY ════════ */}
          {hasForecast && daily?.time && (
            <Glass>
              <Label icon={<span style={{ fontSize: 11 }}>📅</span>} text="10-Day Forecast" />
              <div className="px-4 py-1">
                {daily.time.slice(0, 10).map((date: string, i: number) => {
                  const dc   = daily.weather_code?.[i] ?? 0;
                  const dMax = Math.round(daily.temperature_2m_max?.[i] ?? 0);
                  const dMin = Math.round(daily.temperature_2m_min?.[i] ?? 0);
                  const dP   = daily.precipitation_probability_max?.[i] ?? 0;
                  const label = i === 0 ? 'Today' : SHORT_DAYS[new Date(date).getDay()];
                  const barL  = ((dMin - globalMin) / Math.max(globalMax - globalMin, 1)) * 100;
                  const barW  = ((dMax - dMin) / Math.max(globalMax - globalMin, 1)) * 100;
                  return (
                    <div key={date} className="flex items-center gap-3 py-[11px] border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <p className="text-[14px] font-semibold text-white w-10" style={{ opacity: i === 0 ? 1 : 0.85 }}>{label}</p>
                      <div className="w-10 flex flex-col items-center">
                        <span className="text-[20px]">{getHourIcon(dc)}</span>
                        {dP >= 20 && <p className="text-[10px] font-semibold" style={{ color: '#7DD3F4' }}>{dP}%</p>}
                      </div>
                      <p className="text-[13px] text-white w-7 text-right" style={{ opacity: 0.6 }}>{dMin}°</p>
                      <div className="flex-1 h-[6px] rounded-full relative" style={{ background: 'rgba(255,255,255,0.13)' }}>
                        <div
                          className="absolute h-full rounded-full"
                          style={{ left: `${barL}%`, width: `${Math.max(barW, 6)}%`, background: 'linear-gradient(90deg, #60a5fa, #f59e0b, #ef4444)' }}
                        />
                        {i === 0 && (
                          <div className="absolute w-[10px] h-[10px] rounded-full border-2 border-white -translate-y-[2px]"
                            style={{ left: `${barL + barW * 0.5 - 1}%`, background: 'white', boxShadow: '0 0 5px rgba(0,0,0,0.4)' }}
                          />
                        )}
                      </div>
                      <p className="text-[14px] font-semibold text-white w-7 text-right">{dMax}°</p>
                    </div>
                  );
                })}
              </div>
            </Glass>
          )}

          {/* ════════ WIND ════════ */}
          {hasForecast && (
            <Glass>
              <Label icon={<Wind size={11} color="rgba(255,255,255,0.7)" />} text="Wind" />
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="space-y-4">
                  {[['Wind', `${windSpeed} kph`], ['Gusts', `${Math.round(windGusts)} kph`], ['Direction', `${Math.round(windDir)}° ${getWindDir(windDir)}`]].map(([k, v]) => (
                    <div key={k}>
                      <div className="flex items-baseline gap-5">
                        <span className="text-[14px] text-white w-20" style={{ opacity: 0.65 }}>{k}</span>
                        <span className="text-[14px] font-semibold text-white">{v}</span>
                      </div>
                      <div className="mt-1 w-44 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    </div>
                  ))}
                </div>
                <WindCompass deg={windDir} speed={Number(windSpeed)} />
              </div>
            </Glass>
          )}

          {/* ════════ UV + SUNSET (2-col) ════════ */}
          {hasForecast && (
            <div className="grid grid-cols-2 gap-3">
              <Glass>
                <div className="px-3 pt-3 pb-4">
                  <div className="flex items-center gap-1 mb-2"><Sun size={11} color="rgba(255,255,255,0.65)" /><p className="text-[10px] font-bold tracking-widest uppercase text-white opacity-60">UV Index</p></div>
                  <p className="text-[32px] font-light text-white mb-0.5">{Math.round(uvIndex)}</p>
                  <p className="text-[14px] font-semibold text-white mb-3">{uvInfo.label}</p>
                  <div className="h-[6px] rounded-full relative mb-2" style={{ background: 'linear-gradient(90deg,#4ade80,#84cc16,#facc15,#fb923c,#f87171,#c084fc)' }}>
                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white"
                      style={{ left: `${Math.min((uvIndex / 11) * 100, 94)}%`, background: 'white', boxShadow: '0 0 6px rgba(0,0,0,0.4)' }}
                    />
                  </div>
                  <p className="text-[11px] text-white" style={{ opacity: 0.65, lineHeight: 1.4 }}>{uvInfo.tip}</p>
                </div>
              </Glass>

              {daily?.sunset?.[0] && (
                <Glass>
                  <div className="px-3 pt-3 pb-4">
                    <div className="flex items-center gap-1 mb-2"><Sun size={11} color="rgba(255,255,255,0.65)" /><p className="text-[10px] font-bold tracking-widest uppercase text-white opacity-60">Sunset</p></div>
                    <p className="text-[20px] font-light text-white mb-1">
                      {(() => { const d = new Date(daily.sunset[0]); const h = d.getHours(); return `${h > 12 ? h - 12 : h}:${d.getMinutes().toString().padStart(2,'0')}PM`; })()}
                    </p>
                    <SunArc sunrise={daily.sunrise[0]} sunset={daily.sunset[0]} />
                    <p className="text-[11px] text-white" style={{ opacity: 0.65 }}>
                      Sunrise: {(() => { const d = new Date(daily.sunrise[0]); return `${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}AM`; })()}
                    </p>
                  </div>
                </Glass>
              )}
            </div>
          )}

          {/* ════════ PRECIPITATION + VISIBILITY (2-col) ════════ */}
          {hasForecast && (
            <div className="grid grid-cols-2 gap-3">
              <Glass>
                <div className="px-3 pt-3 pb-4">
                  <div className="flex items-center gap-1 mb-2"><Droplets size={11} color="rgba(255,255,255,0.65)" /><p className="text-[10px] font-bold tracking-widest uppercase text-white opacity-60">Precipitation</p></div>
                  <p className="text-[32px] font-light text-white">{precip.toFixed(1)}<span className="text-[16px] font-normal"> mm</span></p>
                  <p className="text-[11px] text-white mt-4" style={{ opacity: 0.65 }}>
                    {daily?.precipitation_sum?.[0] ? `${daily.precipitation_sum[0].toFixed(1)}mm expected today.` : 'In the last hour.'}
                  </p>
                </div>
              </Glass>
              <Glass>
                <div className="px-3 pt-3 pb-4">
                  <div className="flex items-center gap-1 mb-2"><Eye size={11} color="rgba(255,255,255,0.65)" /><p className="text-[10px] font-bold tracking-widest uppercase text-white opacity-60">Visibility</p></div>
                  <p className="text-[32px] font-light text-white">{visKm}<span className="text-[16px] font-normal"> km</span></p>
                  <p className="text-[11px] text-white mt-4" style={{ opacity: 0.65 }}>
                    {Number(visKm) >= 15 ? 'Perfectly clear view.' : Number(visKm) >= 5 ? 'Moderate visibility.' : 'Low visibility.'}
                  </p>
                </div>
              </Glass>
            </div>
          )}

          {/* ════════ HUMIDITY + PRESSURE (2-col) ════════ */}
          {hasForecast && (
            <div className="grid grid-cols-2 gap-3">
              <Glass>
                <div className="px-3 pt-3 pb-4">
                  <div className="flex items-center gap-1 mb-2"><Droplets size={11} color="rgba(255,255,255,0.65)" /><p className="text-[10px] font-bold tracking-widest uppercase text-white opacity-60">Humidity</p></div>
                  <p className="text-[32px] font-light text-white">{humidity}%</p>
                  <p className="text-[11px] text-white mt-8" style={{ opacity: 0.65 }}>The dew point is {dewPoint}° right now.</p>
                </div>
              </Glass>
              <Glass>
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center gap-1 mb-1"><Gauge size={11} color="rgba(255,255,255,0.65)" /><p className="text-[10px] font-bold tracking-widest uppercase text-white opacity-60">Pressure</p></div>
                  <PressureGauge hPa={Number(pressure)} />
                </div>
              </Glass>
            </div>
          )}

          {/* ════════ FEELS LIKE + AVERAGES (2-col) ════════ */}
          {hasForecast && (
            <div className="grid grid-cols-2 gap-3">
              <Glass>
                <div className="px-3 pt-3 pb-4">
                  <div className="flex items-center gap-1 mb-2"><Thermometer size={11} color="rgba(255,255,255,0.65)" /><p className="text-[10px] font-bold tracking-widest uppercase text-white opacity-60">Feels Like</p></div>
                  <p className="text-[32px] font-light text-white">{feelsLike}°</p>
                  <p className="text-[11px] text-white mt-8 leading-relaxed" style={{ opacity: 0.65 }}>
                    {Number(feelsLike) < Number(temp) ? 'Wind is making it feel cooler.' : Number(feelsLike) > Number(temp) ? 'Humidity is making it feel warmer.' : 'Similar to the actual temperature.'}
                  </p>
                </div>
              </Glass>
              <Glass>
                <div className="px-3 pt-3 pb-4">
                  <div className="flex items-center gap-1 mb-2"><span style={{ fontSize: 11 }}>📊</span><p className="text-[10px] font-bold tracking-widest uppercase text-white opacity-60">Averages</p></div>
                  {(() => {
                    const todayMax = daily?.temperature_2m_max?.[0];
                    const avg = daily?.temperature_2m_max ? Math.round(daily.temperature_2m_max.slice(0, 10).reduce((a: number, b: number) => a + b, 0) / 10) : '--';
                    const diff = todayMax ? Math.round(todayMax - Number(avg)) : 0;
                    return (
                      <>
                        <p className="text-[32px] font-light text-white">{diff > 0 ? `+${diff}` : diff}°</p>
                        <p className="text-[11px] text-white" style={{ opacity: 0.65 }}>from avg high</p>
                        <div className="mt-3 space-y-1">
                          {[['Today', `H:${todayMax ? Math.round(todayMax) : '--'}°`], ['Average', `H:${avg}°`]].map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="text-[11px] text-white opacity-60">{k}</span>
                              <span className="text-[11px] font-semibold text-white">{v}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </Glass>
            </div>
          )}

          {/* ════════ AIR QUALITY ════════ */}
          {hasForecast && (
            <Glass>
              <Label icon={<span style={{ fontSize: 11 }}>🌫️</span>} text="Air Quality" />
              <div className="px-4 py-4">
                {aqiData ? (
                  <>
                    <p className="text-[38px] font-light text-white mb-0">{aqiData.aqi}</p>
                    <p className="text-[16px] font-semibold text-white mb-4">{aqiData.label}</p>
                    {/* Spectrum slider */}
                    <div className="h-[8px] rounded-full relative mb-3"
                      style={{ background: 'linear-gradient(90deg, #4ade80 0%, #a3e635 15%, #facc15 30%, #fb923c 50%, #f87171 70%, #c084fc 85%, #9333ea 100%)' }}>
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded-full border-[2.5px] border-white"
                        style={{
                          left: `${Math.min((aqiData.aqi / 300) * 100, 96)}%`,
                          background: aqiData.color,
                          boxShadow: '0 0 8px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)'
                        }}
                      />
                    </div>
                    {/* Scale labels */}
                    <div className="flex justify-between mb-3">
                      {['Good','Mod','USG','Unhlthy','V.Bad','Haz'].map((l) => (
                        <span key={l} className="text-[9px] text-white" style={{ opacity: 0.5 }}>{l}</span>
                      ))}
                    </div>
                    <p className="text-[12px] text-white leading-relaxed" style={{ opacity: 0.72 }}>
                      Air quality index is {aqiData.aqi}, which is {aqiData.label.toLowerCase()} at this time.
                      PM2.5: {aqiData.pm2_5}μg/m³ · PM10: {aqiData.pm10}μg/m³
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-3 py-2">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: 'white' }} />
                    <p className="text-[13px] text-white" style={{ opacity: 0.6 }}>Fetching air quality…</p>
                  </div>
                )}
              </div>
            </Glass>
          )}

          {/* ════════ FARMING ADVISORY ════════ */}
          {hasForecast && (
            <Glass>
              <Label icon={<span style={{ fontSize: 11 }}>🌾</span>} text="Farming Advisory" />
              <div className="px-4 py-3 space-y-3">
                {(() => {
                  const rain7   = daily?.precipitation_sum?.slice(0,7).reduce((a: number, b: number) => a + b, 0) ?? 0;
                  const maxWind = daily?.wind_speed_10m_max ? Math.max(...daily.wind_speed_10m_max.slice(0,7)) : 0;
                  const avg7    = daily?.temperature_2m_max ? daily.temperature_2m_max.slice(0,7).reduce((a: number, b: number) => a + b, 0) / 7 : 0;
                  const tips: [string, string][] = [];
                  if (rain7 > 20)          tips.push(['🌧️', `${Math.round(rain7)}mm rain expected this week. Delay spraying or harvesting.`]);
                  if (maxWind > 40)         tips.push(['💨', `Winds up to ${Math.round(maxWind)} kph. Secure nets and poly-house covers.`]);
                  if (avg7 > 38)            tips.push(['🌡️', `Heat stress alert! Avg high ${Math.round(avg7)}°C. Irrigate early morning.`]);
                  if (rain7 < 2 && avg7 > 30) tips.push(['🏜️', 'Dry week ahead. Ensure plots are scheduled for irrigation.']);
                  if (tips.length === 0)    tips.push(['✅', 'Favorable conditions for field work this week.']);
                  return tips.map(([icon, text], i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-[16px]">{icon}</span>
                      <p className="text-[13px] text-white flex-1 leading-relaxed" style={{ opacity: 0.88 }}>{text}</p>
                    </div>
                  ));
                })()}
              </div>
            </Glass>
          )}

          {/* No data */}
          {!hasForecast && (
            <Glass className="py-20 text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 rounded-full border-4 mx-auto mb-4"
                style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: 'white' }}
              />
              <p className="text-white text-[15px] font-medium" style={{ opacity: 0.8 }}>Loading weather data…</p>
              <p className="text-white text-[13px] mt-1" style={{ opacity: 0.5 }}>Allow location access for accurate forecast</p>
            </Glass>
          )}

        </div>
      </div>

      {/* ── Floating pill nav (Apple Weather bottom bar) ── */}
      <div className="absolute bottom-0 left-0 right-0 pb-6 flex justify-center items-end"
        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.22))', zIndex: 10 }}>
        <div
          className="flex items-center justify-between"
          style={{
            width: 'calc(100% - 48px)',
            height: 52,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.13)',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.22)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)',
            padding: '0 14px',
          }}
        >
          {/* Left: Map icon */}
          <button className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)' }}>
            <MapPin size={16} color="rgba(255,255,255,0.85)" />
          </button>

          {/* Center: page dots */}
          <div className="flex items-center gap-[5px]">
            <div className="rounded-full" style={{ width: 6, height: 6, background: 'white' }} />
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className="rounded-full" style={{ width: 5, height: 5, background: 'rgba(255,255,255,0.35)' }} />
            ))}
          </div>

          {/* Right: list icon */}
          <button
            onClick={() => navigateTo('home')}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <List size={16} color="rgba(255,255,255,0.85)" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForecastScreen;
