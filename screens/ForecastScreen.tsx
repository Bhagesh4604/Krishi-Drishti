import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Screen, UserProfile } from '../types';
import { MapPin, List, Wind, Droplets, Eye, Gauge, Thermometer, Sun, ArrowLeft } from 'lucide-react';

interface ForecastScreenProps {
  navigateTo: (screen: Screen) => void;
  t: any;
  weather?: any;
  user?: UserProfile | null;
  locationName?: string;
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── WMO code → label + icon ────────────────────────────────────────────────
const getCondition = (code: number, isDay = 1) => {
  if (code === 0)  return { label: isDay ? 'Clear' : 'Clear Night', theme: isDay ? 'clear-day' : 'clear-night' };
  if (code <= 2)   return { label: 'Partly Cloudy', theme: isDay ? 'partly-cloudy' : 'cloudy' };
  if (code === 3)  return { label: 'Overcast', theme: 'cloudy' };
  if (code <= 48)  return { label: 'Foggy', theme: 'fog' };
  if (code <= 57)  return { label: 'Drizzle', theme: 'rain' };
  if (code <= 67)  return { label: 'Rain', theme: 'rain' };
  if (code <= 77)  return { label: 'Snow', theme: 'snow' };
  if (code <= 82)  return { label: 'Showers', theme: 'rain' };
  if (code <= 99)  return { label: 'Thunderstorm', theme: 'thunder' };
  return { label: 'Unknown', theme: 'cloudy' };
};

const getHourEmoji = (code: number) => {
  if (code === 0) return '☀️';
  if (code <= 2)  return '⛅';
  if (code === 3) return '☁️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 99) return '⛈️';
  return '🌡️';
};

// ─── Theme gradient for background ──────────────────────────────────────────
const getThemeBg = (theme: string) => {
  switch (theme) {
    case 'clear-day':     return 'linear-gradient(180deg, #1a4a8a 0%, #2563b0 40%, #3b82d0 100%)';
    case 'clear-night':   return 'linear-gradient(180deg, #020817 0%, #0d1b3e 40%, #1a2b5e 100%)';
    case 'partly-cloudy': return 'linear-gradient(180deg, #1e3a6e 0%, #2d4f8a 40%, #3d6aaa 100%)';
    case 'cloudy':        return 'linear-gradient(180deg, #1b243b 0%, #293652 40%, #3a4b6b 100%)';
    case 'rain':          return 'linear-gradient(180deg, #1a2026 0%, #2c3540 50%, #44515f 100%)';
    case 'thunder':       return 'linear-gradient(180deg, #0a0e14 0%, #141c28 40%, #1e2a3c 100%)';
    case 'snow':          return 'linear-gradient(180deg, #2c3e5a 0%, #3d526e 40%, #536882 100%)';
    case 'fog':           return 'linear-gradient(180deg, #3a4050 0%, #4e5568 40%, #616880 100%)';
    default:              return 'linear-gradient(180deg, #1b243b 0%, #293652 40%, #3a4b6b 100%)';
  }
};

const getWindDir = (deg: number) => {
  const d = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return d[Math.round(deg / 22.5) % 16];
};

// ═══════════════════════════════════════════════════════════════
//  CANVAS PARTICLE WEATHER ENGINE (exact match to reference HTML)
// ═══════════════════════════════════════════════════════════════
const WeatherCanvas: React.FC<{ theme: string }> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef   = useRef(theme);
  const animRef    = useRef<number>(0);

  useEffect(() => { themeRef.current = theme; }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0;

    interface Star  { x:number; y:number; r:number; opacity:number; ts:number; td:number }
    interface Cloud { x:number; y:number; r:number; vx:number; opacity:number }
    interface Drop  { x:number; y:number; length:number; vy:number; vx:number; thickness:number; opacity:number }
    interface Flake { x:number; y:number; r:number; vy:number; vx:number; opacity:number; phase:number }

    let stars:  Star[]  = [];
    let clouds: Cloud[] = [];
    let drops:  Drop[]  = [];
    let flakes: Flake[] = [];

    const initParticles = () => {
      stars  = []; clouds = []; drops = []; flakes = [];

      // Stars
      const sc = Math.floor((W * H) / 3000);
      for (let i = 0; i < sc; i++)
        stars.push({ x: Math.random()*W, y: Math.random()*H*0.7, r: Math.random()*1.5,
          opacity: Math.random(), ts: 0.005+Math.random()*0.015, td: Math.random()>0.5?1:-1 });

      // Clouds (12 large radial blobs)
      for (let i = 0; i < 12; i++)
        clouds.push({ x: Math.random()*W, y: (Math.random()*H*0.5)-100,
          r: 150+Math.random()*300, vx: 0.1+Math.random()*0.3, opacity: 0.1+Math.random()*0.2 });

      // Rain
      const rc = Math.floor(W / 3);
      for (let i = 0; i < rc; i++) {
        const z = Math.random();
        drops.push({ x: Math.random()*W, y: Math.random()*H,
          length: 10+z*30, vy: 15+z*20, vx: 2+z*3, thickness: 0.5+z*1.5, opacity: 0.2+z*0.4 });
      }

      // Snow flakes
      for (let i = 0; i < 80; i++)
        flakes.push({ x: Math.random()*W, y: Math.random()*H,
          r: 1.5+Math.random()*3, vy: 0.8+Math.random()*1.5, vx: (Math.random()-0.5)*0.6,
          opacity: 0.5+Math.random()*0.5, phase: Math.random()*Math.PI*2 });
    };

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      initParticles();
    };

    let frame = 0;
    const draw = () => {
      const t = themeRef.current;
      ctx.clearRect(0, 0, W, H);
      frame++;

      // ── Stars (clear / cloudy nights) ──────────────────────────────
      if (['clear-night','partly-cloudy','cloudy'].includes(t)) {
        stars.forEach(s => {
          s.opacity += s.ts * s.td;
          if (s.opacity >= 1)  { s.opacity = 1;   s.td = -1; }
          if (s.opacity <= 0.1){ s.opacity = 0.1; s.td =  1; }
          ctx.globalAlpha = s.opacity;
          ctx.fillStyle = 'white';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // ── Clouds ──────────────────────────────────────────────────────
      const isRain = ['rain','thunder'].includes(t);
      const isSnow = t === 'snow';
      const baseRgb = isRain ? '20,25,30' : isSnow ? '200,210,220' : '150,160,180';
      clouds.forEach(c => {
        c.x += c.vx;
        if (c.x - c.r > W) { c.x = -c.r; c.y = (Math.random()*H*0.5)-100; }
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
        g.addColorStop(0, `rgba(${baseRgb},${c.opacity})`);
        g.addColorStop(1, `rgba(${baseRgb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
      });

      // ── Sun halo (clear day) ────────────────────────────────────────
      if (t === 'clear-day') {
        const g = ctx.createRadialGradient(W*0.72, H*0.1, 0, W*0.72, H*0.1, 140);
        g.addColorStop(0, 'rgba(255,240,160,0.45)');
        g.addColorStop(0.4, 'rgba(255,220,100,0.18)');
        g.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }

      // ── Rain ────────────────────────────────────────────────────────
      if (['rain','thunder'].includes(t)) {
        ctx.lineCap = 'round';
        drops.forEach(d => {
          d.x += d.vx; d.y += d.vy;
          if (d.y > H || d.x > W) { d.y = -d.length; d.x = Math.random()*W - H*(d.vx/d.vy); }
          ctx.strokeStyle = `rgba(200,210,225,${d.opacity})`;
          ctx.lineWidth = d.thickness;
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x-d.vx, d.y-d.length); ctx.stroke();
        });
      }

      // ── Lightning (thunder) ──────────────────────────────────────────
      if (t === 'thunder' && frame % 240 < 6) {
        ctx.globalAlpha = (6 - frame%240) * 0.08;
        ctx.fillStyle = 'rgba(200,220,255,1)'; ctx.fillRect(0,0,W,H);
        ctx.globalAlpha = 1;
        if (frame%240 === 1) {
          const lx = 80+Math.random()*(W-160);
          ctx.strokeStyle='rgba(220,235,255,0.9)'; ctx.lineWidth=2.5;
          ctx.beginPath(); ctx.moveTo(lx,0);
          ctx.lineTo(lx-18+Math.random()*36, H*0.3);
          ctx.lineTo(lx+14+Math.random()*22, H*0.3);
          ctx.lineTo(lx-8+Math.random()*28, H*0.6); ctx.stroke();
        }
      }

      // ── Snow ─────────────────────────────────────────────────────────
      if (t === 'snow') {
        flakes.forEach(f => {
          f.y += f.vy; f.x += f.vx + Math.sin(frame*0.02+f.phase)*0.4;
          if (f.y > H) { f.y = -10; f.x = Math.random()*W; }
          ctx.globalAlpha = f.opacity;
          ctx.fillStyle = 'white';
          ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // ── Fog bands ──────────────────────────────────────────────────
      if (t === 'fog') {
        for (let i=0; i<3; i++) {
          const y = H*(0.3+i*0.2) + Math.sin(frame*0.003+i)*15;
          const g = ctx.createLinearGradient(0,y-40,0,y+40);
          g.addColorStop(0,'rgba(255,255,255,0)');
          g.addColorStop(0.5,`rgba(255,255,255,${0.06+i*0.02})`);
          g.addColorStop(1,'rgba(255,255,255,0)');
          ctx.fillStyle=g; ctx.fillRect(0,y-40,W,80);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    // Start on next frame (ensures window dims are ready)
    animRef.current = requestAnimationFrame(() => { resize(); draw(); });
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []); // runs once — theme is read via ref

  return (
    <canvas ref={canvasRef}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block', zIndex:0 }}
    />
  );
};

// ─── Dark blue glass panel (matching reference HTML exactly) ────────────────
const Glass: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> =
  ({ children, className='', style={} }) => (
  <div className={`rounded-3xl overflow-hidden ${className}`} style={{
    background: 'rgba(28, 38, 65, 0.45)',
    backdropFilter: 'blur(25px)',
    WebkitBackdropFilter: 'blur(25px)',
    borderTop: '1px solid rgba(255,255,255,0.15)',
    borderLeft: '1px solid rgba(255,255,255,0.10)',
    borderBottom: '1px solid rgba(0,0,0,0.30)',
    borderRight: '1px solid rgba(0,0,0,0.30)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.20)',
    ...style
  }}>{children}</div>
);

// ─── Section header row ────────────────────────────────────────────────────
const SectionHeader: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="px-4 py-3 flex items-center gap-2"
    style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
    <span style={{ color:'rgba(255,255,255,0.5)', display:'flex' }}>{icon}</span>
    <span className="text-xs font-semibold tracking-widest uppercase"
      style={{ color:'rgba(255,255,255,0.55)' }}>{label}</span>
  </div>
);

// ─── Temperature range bar ────────────────────────────────────────────────
const TempBar: React.FC<{
  low: number; high: number; globalMin: number; globalMax: number; current?: number | null;
}> = ({ low, high, globalMin, globalMax, current }) => {
  const range = Math.max(globalMax - globalMin, 1);
  const left  = ((low  - globalMin) / range) * 100;
  const width = Math.max(((high - low) / range) * 100, 8);
  const dotLeft = current != null && high > low
    ? ((current - low) / (high - low)) * 100 : null;
  return (
    <div className="flex-1 mx-3 relative" style={{ height:6, borderRadius:999, background:'rgba(0,0,0,0.30)' }}>
      <div style={{
        position:'absolute', height:'100%', borderRadius:999,
        left:`${left}%`, width:`${width}%`,
        background:'linear-gradient(90deg,#4facfe 0%,#00f2fe 50%,#f093fb 100%)'
      }}>
        {dotLeft != null && (
          <div style={{
            position:'absolute', top:'50%', transform:'translate(-50%,-50%)',
            left:`${Math.min(Math.max(dotLeft,4),96)}%`,
            width:10, height:10, borderRadius:'50%', background:'white',
            boxShadow:'0 0 5px rgba(0,0,0,0.5)', zIndex:2
          }}/>
        )}
      </div>
    </div>
  );
};

// ─── Wind compass SVG ─────────────────────────────────────────────────────
const WindCompass: React.FC<{ deg: number; speed: number }> = ({ deg, speed }) => (
  <div style={{ width:100, height:100 }}>
    <svg width="100" height="100" viewBox="0 0 100 100">
      {Array.from({length:36}).map((_,i)=>{
        const a=(i*10*Math.PI)/180, main=i%9===0;
        return <line key={i}
          x1={50+(main?39:41)*Math.sin(a)} y1={50-(main?39:41)*Math.cos(a)}
          x2={50+45*Math.sin(a)}           y2={50-45*Math.cos(a)}
          stroke={`rgba(255,255,255,${main?0.5:0.2})`} strokeWidth={main?2:1}/>;
      })}
      {([['N',0],['E',90],['S',180],['W',270]] as [string,number][]).map(([l,d])=>{
        const r=(d*Math.PI)/180;
        return <text key={l} x={50+28*Math.sin(r)} y={50-28*Math.cos(r)+4}
          textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9" fontWeight="700">{l}</text>;
      })}
      <g transform={`rotate(${deg},50,50)`}>
        <polygon points="50,14 53,44 50,47 47,44" fill="white" opacity="0.95"/>
        <circle cx="50" cy="50" r="3" fill="white"/>
        <polygon points="50,86 53,56 50,53 47,56" fill="rgba(255,255,255,0.25)"/>
      </g>
      <text x="50" y="47" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">{Math.round(speed)}</text>
      <text x="50" y="57" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="8">kph</text>
    </svg>
  </div>
);

// ─── Pressure gauge SVG ─────────────────────────────────────────────────────
const PressureGauge: React.FC<{ hPa: number }> = ({ hPa }) => {
  const n   = Math.min(Math.max((hPa-980)/60,0),1);
  const sa  = -130, ea = 130;
  const ang = (sa + n*(ea-sa))*Math.PI/180;
  const nx  = 50 + 28*Math.cos(ang), ny = 52 + 28*Math.sin(ang);
  return (
    <svg width="100" height="74" viewBox="0 0 100 74">
      <path d={`M ${50+36*Math.cos(-130*Math.PI/180)} ${52+36*Math.sin(-130*Math.PI/180)} A 36 36 0 1 1 ${50+36*Math.cos(130*Math.PI/180)} ${52+36*Math.sin(130*Math.PI/180)}`}
        fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="5" strokeLinecap="round"/>
      {Array.from({length:11}).map((_,i)=>{
        const a=(-130+(i/10)*260)*Math.PI/180;
        return <line key={i} x1={50+30*Math.cos(a)} y1={52+30*Math.sin(a)} x2={50+37*Math.cos(a)} y2={52+37*Math.sin(a)}
          stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>;
      })}
      <line x1="50" y1="52" x2={nx} y2={ny} stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="50" cy="52" r="3.5" fill="white"/>
      <text x="50" y="44" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">{Math.round(hPa).toLocaleString()}</text>
      <text x="50" y="55" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="7">hPa</text>
      <text x="12" y="68" fill="rgba(255,255,255,0.45)" fontSize="8">Low</text>
      <text x="78" y="68" fill="rgba(255,255,255,0.45)" fontSize="8">High</text>
    </svg>
  );
};

// ─── Sun arc ──────────────────────────────────────────────────────────────
const SunArc: React.FC<{ sunrise: string; sunset: string }> = ({ sunrise, sunset }) => {
  const now=Date.now(), sr=new Date(sunrise).getTime(), ss=new Date(sunset).getTime();
  const p  = Math.min(Math.max((now-sr)/(ss-sr),0),1);
  const toR= (d:number)=>d*Math.PI/180;
  const cx=60, cy=55, r=40, sa=-210, ea=-330; // arc goes left→right along bottom
  // Apple Weather uses an arc from lower-left to lower-right
  const saR=toR(210), eaR=toR(330);
  const sx=cx+r*Math.cos(saR), sy=cy+r*Math.sin(saR);
  const ex=cx+r*Math.cos(eaR), ey=cy+r*Math.sin(eaR);
  const aR=toR(210+p*120);
  const sunX=cx+r*Math.cos(aR), sunY=cy+r*Math.sin(aR);
  return (
    <svg width="120" height="65" viewBox="0 0 120 65">
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`}
        fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5"/>
      {p>0&&<path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${sunX} ${sunY}`}
        fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5"/>}
      <circle cx={sunX} cy={sunY} r="5" fill="white"/>
      <circle cx={sunX} cy={sunY} r="8" fill="rgba(255,255,255,0.22)"/>
    </svg>
  );
};

// ════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
const ForecastScreen: React.FC<ForecastScreenProps> = ({ navigateTo, weather, locationName }) => {
  const current = weather?.current;
  const daily   = weather?.daily;
  const hourly  = weather?.hourly;
  const has     = !!current && !!daily;

  const temp      = current ? Math.round(current.temperature_2m) : null;
  const feelsLike = current ? Math.round(current.apparent_temperature ?? current.temperature_2m) : null;
  const code      = current?.weather_code ?? 0;
  const isDay     = current?.is_day ?? 1;
  const cond      = getCondition(code, isDay);
  const humidity  = current?.relative_humidity_2m ?? '--';
  const windSpeed = current ? Math.round(current.wind_speed_10m) : '--';
  const windDir   = current?.wind_direction_10m ?? 0;
  const windGusts = daily?.wind_gusts_10m_max?.[0] ?? 0;
  const pressure  = current?.surface_pressure ?? 1013;
  const visKm     = current ? Math.round((current.visibility ?? 10000) / 1000) : '--';
  const uvIndex   = current?.uv_index ?? daily?.uv_index_max?.[0] ?? 0;
  const dewPoint  = current ? Math.round(current.dew_point_2m ?? 20) : '--';
  const precip    = current?.precipitation ?? 0;

  const allMax  = daily?.temperature_2m_max ?? [];
  const allMin  = daily?.temperature_2m_min ?? [];
  const gMin    = allMin.length ? Math.min(...allMin.slice(0,10)) : 0;
  const gMax    = allMax.length ? Math.max(...allMax.slice(0,10)) : 40;

  const now     = new Date();
  const nowIdx  = hourly?.time ? hourly.time.findIndex((t: string) => new Date(t) >= now) : 0;
  const hStart  = nowIdx >= 0 ? nowIdx : 0;
  const hourSlice: string[] = hourly?.time?.slice(hStart, hStart+24) ?? [];

  const themeBg = getThemeBg(cond.theme);

  const getSummary = () => {
    const gusts = Math.round(windGusts);
    const rainH = hourSlice.findIndex((_:any,i:number)=>(hourly?.precipitation_probability?.[hStart+i]??0)>=40);
    const parts: string[] = [];
    if (rainH >= 0) {
      const h = new Date(hourSlice[rainH]).getHours();
      parts.push(`Rain expected around ${h>12?h-12+'PM':h+'AM'}.`);
    }
    if (gusts > 40) parts.push(`Wind gusts up to ${gusts} kph.`);
    if (!parts.length) parts.push(`${cond.label} conditions throughout the day.`);
    return parts.join(' ');
  };

  const uvLabel = uvIndex<=2?'Low':uvIndex<=5?'Moderate':uvIndex<=7?'High':uvIndex<=10?'Very High':'Extreme';
  const uvTip   = uvIndex<=2?'No protection needed.':uvIndex<=5?'Use sun protection until 4PM.':uvIndex<=7?'Seek shade during peak hours.':'Avoid sun 10AM–4PM.';

  // AQI (self-fetch)
  const [aqi, setAqi] = useState<{ aqi:number; label:string; color:string; pm2_5:number; pm10:number }|null>(null);
  useEffect(()=>{
    if (!current) return;
    const lat = (weather as any)?.latitude;
    const lng = (weather as any)?.longitude;
    if (!lat||!lng) return;
    const isNative = typeof (window as any).Capacitor!=='undefined' && (window as any).Capacitor?.isNativePlatform?.()===true;
    const base = isNative ? 'http://10.0.2.2:8000/api' : '/api';
    fetch(`${base}/weather/airquality?lat=${lat}&lng=${lng}`)
      .then(r=>r.json()).then(setAqi).catch(()=>{});
  },[current]);

  return (
    <div style={{ position:'relative', height:'100vh', overflow:'hidden', background:'#000',
      fontFamily:'-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>

      {/* ── Animated background ── */}
      <div style={{ position:'absolute', inset:0, zIndex:0, transition:'background 1.5s ease-in-out', background: themeBg }}>
        <WeatherCanvas theme={cond.theme} />
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ position:'relative', zIndex:10, height:'100vh', overflowY:'auto', paddingBottom:100 }}
        className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        {/* Back button */}
        <button onClick={()=>navigateTo('home')}
          style={{ position:'absolute', top:52, left:16, zIndex:20, width:34, height:34,
            borderRadius:'50%', background:'rgba(28,38,65,0.5)',
            border:'1px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ArrowLeft size={15} color="white"/>
        </button>

        {/* ════ HERO ════ */}
        <header style={{ paddingTop:64, paddingBottom:40, textAlign:'center' }}>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.15em', color:'rgba(255,255,255,0.65)',
            textTransform:'uppercase', marginBottom:4 }}>MY LOCATION</p>
          <h1 style={{ fontSize:36, fontWeight:300, color:'white', margin:'0 0 4px',
            textShadow:'0 2px 12px rgba(0,0,0,0.4)' }}>
            {locationName && !locationName.includes('Locating') ? locationName.split(',')[0] : 'My Location'}
          </h1>
          {temp !== null ? (
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'center', position:'relative', paddingLeft:16 }}>
              <span style={{ fontSize:90, fontWeight:100, lineHeight:1, letterSpacing:'-4px',
                color:'white', textShadow:'0 4px 24px rgba(0,0,0,0.25)' }}>{temp}</span>
              <span style={{ fontSize:36, fontWeight:300, color:'white', marginTop:10 }}>°</span>
            </div>
          ) : (
            <div style={{ display:'flex', justifyContent:'center', margin:'24px 0' }}>
              <div style={{ width:40, height:40, borderRadius:'50%',
                border:'3px solid rgba(255,255,255,0.25)', borderTopColor:'white',
                animation:'spin 1.2s linear infinite' }}/>
            </div>
          )}
          <p style={{ fontSize:20, fontWeight:500, color:'white', opacity:.9, margin:'6px 0 4px' }}>
            {temp !== null ? cond.label : 'Loading…'}
          </p>
          {temp !== null && (
            <p style={{ fontSize:17, fontWeight:500, color:'rgba(255,255,255,0.75)' }}>
              H:{daily?.temperature_2m_max?.[0]!==undefined?Math.round(daily.temperature_2m_max[0]):'--'}°&nbsp;&nbsp;
              L:{daily?.temperature_2m_min?.[0]!==undefined?Math.round(daily.temperature_2m_min[0]):'--'}°
            </p>
          )}
        </header>

        <div style={{ padding:'0 16px', maxWidth:640, margin:'0 auto', display:'flex', flexDirection:'column', gap:12 }}>

          {/* ════ HOURLY ════ */}
          {has && (
            <Glass>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize:15, fontWeight:500, color:'white', lineHeight:1.4, margin:0 }}>{getSummary()}</p>
              </div>
              <div style={{ overflowX:'auto', display:'flex', padding:'12px 16px', gap:24, scrollbarWidth:'none' }}>
                {hourSlice.map((ts: string, i: number)=>{
                  const hCode = hourly?.weather_code?.[hStart+i] ?? 0;
                  const hTemp = hourly?.temperature_2m?.[hStart+i];
                  const hPrec = hourly?.precipitation_probability?.[hStart+i] ?? 0;
                  const hr    = new Date(ts).getHours();
                  const label = i===0?'Now':hr===0?'12AM':hr<12?`${hr}AM`:hr===12?'12PM':`${hr-12}PM`;
                  return (
                    <div key={ts} style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:48, gap:4 }}>
                      <span style={{ fontSize:15, fontWeight:500, color: i===0?'white':'rgba(255,255,255,0.88)' }}>{label}</span>
                      <span style={{ fontSize:22 }}>{getHourEmoji(hCode)}</span>
                      <div style={{ height:16, display:'flex', alignItems:'center' }}>
                        {hPrec>=20 && <span style={{ fontSize:11, fontWeight:700, color:'#4facfe' }}>{hPrec}%</span>}
                      </div>
                      <span style={{ fontSize:19, fontWeight:500, color:'white' }}>
                        {hTemp!==undefined?Math.round(hTemp):'--'}°
                      </span>
                    </div>
                  );
                })}
              </div>
            </Glass>
          )}

          {/* ════ 10-DAY ════ */}
          {has && daily?.time && (
            <Glass>
              <SectionHeader icon={<span style={{fontSize:13}}>📅</span>} label="10-Day Forecast"/>
              <div style={{ padding:'4px 16px' }}>
                {daily.time.slice(0,10).map((date:string,i:number)=>{
                  const dc   = daily.weather_code?.[i] ?? 0;
                  const dMax = Math.round(daily.temperature_2m_max?.[i]??0);
                  const dMin = Math.round(daily.temperature_2m_min?.[i]??0);
                  const dP   = daily.precipitation_probability_max?.[i]??0;
                  const label= i===0?'Today':SHORT_DAYS[new Date(date).getDay()];
                  return (
                    <div key={date} style={{ display:'flex', alignItems:'center', padding:'10px 0',
                      borderBottom: i<9?'1px solid rgba(255,255,255,0.08)':'none' }}>
                      <span style={{ width:52, fontSize:18, fontWeight:500, color:i===0?'white':'rgba(255,255,255,0.88)' }}>{label}</span>
                      <div style={{ width:48, display:'flex', flexDirection:'column', alignItems:'center' }}>
                        <span style={{ fontSize:22 }}>{getHourEmoji(dc)}</span>
                        {dP>=20&&<span style={{ fontSize:11, fontWeight:700, color:'#4facfe', marginTop:2 }}>{dP}%</span>}
                      </div>
                      <span style={{ fontSize:18, fontWeight:500, color:'rgba(255,255,255,0.55)', width:32, textAlign:'right' }}>{dMin}°</span>
                      <TempBar low={dMin} high={dMax} globalMin={gMin} globalMax={gMax}
                        current={i===0?temp:undefined}/>
                      <span style={{ fontSize:18, fontWeight:500, color:'white', width:32, textAlign:'right' }}>{dMax}°</span>
                    </div>
                  );
                })}
              </div>
            </Glass>
          )}

          {/* ════ WIND ════ */}
          {has && (
            <Glass>
              <SectionHeader icon={<Wind size={12}/>} label="Wind"/>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {([['Wind', `${windSpeed} kph`],['Gusts',`${Math.round(windGusts)} kph`],['Direction',`${Math.round(windDir)}° ${getWindDir(windDir)}`]] as [string,string][]).map(([k,v])=>(
                    <div key={k}>
                      <div style={{ display:'flex', alignItems:'baseline', gap:20 }}>
                        <span style={{ fontSize:14, color:'rgba(255,255,255,0.55)', width:80 }}>{k}</span>
                        <span style={{ fontSize:15, fontWeight:600, color:'white' }}>{v}</span>
                      </div>
                      <div style={{ marginTop:4, width:200, height:1, background:'rgba(255,255,255,0.08)' }}/>
                    </div>
                  ))}
                </div>
                <WindCompass deg={windDir} speed={Number(windSpeed)}/>
              </div>
            </Glass>
          )}

          {/* ════ UV + SUNSET ════ */}
          {has && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Glass>
                <div style={{ padding:'14px' }}>
                  <SectionHeader icon={<Sun size={11}/>} label="UV Index"/>
                  <div style={{ padding:'10px 0 4px' }}>
                    <p style={{ fontSize:36, fontWeight:200, color:'white', margin:'0 0 2px' }}>{Math.round(uvIndex)}</p>
                    <p style={{ fontSize:15, fontWeight:600, color:'white', margin:'0 0 12px' }}>{uvLabel}</p>
                    <div style={{ height:7, borderRadius:999, position:'relative', marginBottom:8,
                      background:'linear-gradient(90deg,#4ade80,#facc15,#fb923c,#f87171,#c084fc)' }}>
                      <div style={{ position:'absolute', top:'50%', transform:'translate(-50%,-50%)',
                        left:`${Math.min((uvIndex/11)*100,94)}%`,
                        width:13, height:13, borderRadius:'50%', background:'white',
                        boxShadow:'0 0 6px rgba(0,0,0,0.5)' }}/>
                    </div>
                    <p style={{ fontSize:11, color:'rgba(255,255,255,0.6)', lineHeight:1.4, margin:0 }}>{uvTip}</p>
                  </div>
                </div>
              </Glass>
              {daily?.sunset?.[0] && (
                <Glass>
                  <div style={{ padding:'14px' }}>
                    <SectionHeader icon={<Sun size={11}/>} label="Sunset"/>
                    <div style={{ padding:'10px 0 4px' }}>
                      <p style={{ fontSize:22, fontWeight:200, color:'white', margin:'0 0 4px' }}>
                        {(()=>{ const d=new Date(daily.sunset[0]); const h=d.getHours(); return `${h>12?h-12:h}:${d.getMinutes().toString().padStart(2,'0')}PM`; })()}
                      </p>
                      <SunArc sunrise={daily.sunrise[0]} sunset={daily.sunset[0]}/>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', margin:0 }}>
                        Sunrise: {(()=>{ const d=new Date(daily.sunrise[0]); return `${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}AM`; })()}
                      </p>
                    </div>
                  </div>
                </Glass>
              )}
            </div>
          )}

          {/* ════ PRECIPITATION + VISIBILITY ════ */}
          {has && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Glass>
                <div style={{ padding:'14px' }}>
                  <SectionHeader icon={<Droplets size={11}/>} label="Precipitation"/>
                  <p style={{ fontSize:34, fontWeight:200, color:'white', margin:'10px 0 2px' }}>{precip.toFixed(1)}<span style={{fontSize:16,fontWeight:400}}> mm</span></p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:20 }}>
                    {daily?.precipitation_sum?.[0]?`${daily.precipitation_sum[0].toFixed(1)}mm expected today.`:'In the last hour.'}
                  </p>
                </div>
              </Glass>
              <Glass>
                <div style={{ padding:'14px' }}>
                  <SectionHeader icon={<Eye size={11}/>} label="Visibility"/>
                  <p style={{ fontSize:34, fontWeight:200, color:'white', margin:'10px 0 2px' }}>{visKm}<span style={{fontSize:16,fontWeight:400}}> km</span></p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:20 }}>
                    {Number(visKm)>=15?'Perfectly clear view.':Number(visKm)>=5?'Moderate visibility.':'Poor visibility.'}
                  </p>
                </div>
              </Glass>
            </div>
          )}

          {/* ════ HUMIDITY + PRESSURE ════ */}
          {has && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Glass>
                <div style={{ padding:'14px' }}>
                  <SectionHeader icon={<Droplets size={11}/>} label="Humidity"/>
                  <p style={{ fontSize:34, fontWeight:200, color:'white', margin:'10px 0 0' }}>{humidity}%</p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:28 }}>Dew point {dewPoint}°.</p>
                </div>
              </Glass>
              <Glass>
                <div style={{ padding:'14px' }}>
                  <SectionHeader icon={<Gauge size={11}/>} label="Pressure"/>
                  <div style={{ marginTop:10 }}><PressureGauge hPa={Number(pressure)}/></div>
                </div>
              </Glass>
            </div>
          )}

          {/* ════ FEELS LIKE + AVERAGES ════ */}
          {has && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Glass>
                <div style={{ padding:'14px' }}>
                  <SectionHeader icon={<Thermometer size={11}/>} label="Feels Like"/>
                  <p style={{ fontSize:34, fontWeight:200, color:'white', margin:'10px 0 0' }}>{feelsLike}°</p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:24, lineHeight:1.4 }}>
                    {Number(feelsLike)<Number(temp)?'Wind makes it feel cooler.':Number(feelsLike)>Number(temp)?'Humidity makes it feel warmer.':'Similar to actual temp.'}
                  </p>
                </div>
              </Glass>
              <Glass>
                <div style={{ padding:'14px' }}>
                  <SectionHeader icon={<span style={{fontSize:11}}>📊</span>} label="Averages"/>
                  {(()=>{
                    const todayMax=daily?.temperature_2m_max?.[0];
                    const avg10=daily?.temperature_2m_max?Math.round(daily.temperature_2m_max.slice(0,10).reduce((a:number,b:number)=>a+b,0)/10):'--';
                    const diff=todayMax?Math.round(todayMax-Number(avg10)):0;
                    return <>
                      <p style={{ fontSize:34, fontWeight:200, color:'white', margin:'10px 0 0' }}>{diff>0?`+${diff}`:diff}°</p>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', margin:'4px 0 12px' }}>from avg high</p>
                      {[['Today',`H:${todayMax?Math.round(todayMax):'--'}°`],['10-day avg',`H:${avg10}°`]].map(([k,v])=>(
                        <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{k}</span>
                          <span style={{ fontSize:11, fontWeight:600, color:'white' }}>{v}</span>
                        </div>
                      ))}
                    </>;
                  })()}
                </div>
              </Glass>
            </div>
          )}

          {/* ════ AIR QUALITY ════ */}
          {has && (
            <Glass>
              <SectionHeader icon={<span style={{fontSize:11}}>🌫️</span>} label="Air Quality"/>
              <div style={{ padding:'14px' }}>
                {aqi ? (
                  <>
                    <p style={{ fontSize:38, fontWeight:200, color:'white', margin:'0 0 2px' }}>{aqi.aqi}</p>
                    <p style={{ fontSize:16, fontWeight:600, color:'white', margin:'0 0 14px' }}>{aqi.label}</p>
                    <div style={{ height:8, borderRadius:999, position:'relative', marginBottom:6,
                      background:'linear-gradient(90deg,#4ade80 0%,#a3e635 15%,#facc15 30%,#fb923c 50%,#f87171 70%,#c084fc 85%,#9333ea 100%)' }}>
                      <div style={{ position:'absolute', top:'50%', transform:'translate(-50%,-50%)',
                        left:`${Math.min((aqi.aqi/300)*100,94)}%`,
                        width:14, height:14, borderRadius:'50%', background:aqi.color, border:'2px solid white',
                        boxShadow:'0 0 8px rgba(0,0,0,0.5)' }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                      {['Good','Mod','USG','Bad','V.Bad','Haz'].map(l=>(
                        <span key={l} style={{ fontSize:9, color:'rgba(255,255,255,0.45)' }}>{l}</span>
                      ))}
                    </div>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.65)', lineHeight:1.5, margin:0 }}>
                      AQI {aqi.aqi} — {aqi.label.toLowerCase()} at this time.
                      PM2.5: {aqi.pm2_5}μg/m³ · PM10: {aqi.pm10}μg/m³
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', padding:'8px 0' }}>Fetching air quality…</p>
                )}
              </div>
            </Glass>
          )}

          {/* ════ FARMING ADVISORY ════ */}
          {has && (
            <Glass>
              <SectionHeader icon={<span style={{fontSize:11}}>🌾</span>} label="Farming Advisory"/>
              <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:12 }}>
                {(()=>{
                  const rain7  = daily?.precipitation_sum?.slice(0,7).reduce((a:number,b:number)=>a+b,0)??0;
                  const mxWind = daily?.wind_speed_10m_max?Math.max(...daily.wind_speed_10m_max.slice(0,7)):0;
                  const avg7   = daily?.temperature_2m_max?daily.temperature_2m_max.slice(0,7).reduce((a:number,b:number)=>a+b,0)/7:0;
                  const tips:[string,string][] = [];
                  if (rain7>20)           tips.push(['🌧️',`${Math.round(rain7)}mm rain this week. Delay spraying or harvesting.`]);
                  if (mxWind>40)          tips.push(['💨',`Winds up to ${Math.round(mxWind)} kph. Secure nets and covers.`]);
                  if (avg7>38)            tips.push(['🌡️',`Heat stress! Avg high ${Math.round(avg7)}°C. Irrigate early morning.`]);
                  if (rain7<2&&avg7>30)   tips.push(['🏜️','Dry week ahead. Schedule irrigation for plots.']);
                  if (!tips.length)       tips.push(['✅','Favorable conditions for field work this week.']);
                  return tips.map(([icon,text],i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                      <span style={{ fontSize:18 }}>{icon}</span>
                      <p style={{ fontSize:13, color:'rgba(255,255,255,0.85)', lineHeight:1.5, margin:0 }}>{text}</p>
                    </div>
                  ));
                })()}
              </div>
            </Glass>
          )}

          {/* No data */}
          {!has && (
            <Glass style={{ padding:'60px 24px', textAlign:'center' }}>
              <p style={{ fontSize:15, color:'rgba(255,255,255,0.7)', margin:0 }}>Loading weather data…</p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:8 }}>Allow location access for accurate forecast.</p>
            </Glass>
          )}
        </div>
      </div>

      {/* ════ FLOATING PILL NAV (exact match to reference) ════ */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:30,
        background:'linear-gradient(to top, rgba(0,0,0,0.75) 60%, transparent 100%)',
        padding:'8px 24px 24px', display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <button style={{ padding:8, color:'rgba(255,255,255,0.85)', display:'flex' }}>
          <MapPin size={24}/>
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
          background:'rgba(0,0,0,0.35)', borderRadius:999,
          backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'white' }}/>
          {[0,1,2,3,4,5,6].map(i=>(
            <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,0.35)' }}/>
          ))}
        </div>
        <button onClick={()=>navigateTo('home')}
          style={{ padding:8, color:'rgba(255,255,255,0.85)', display:'flex' }}>
          <List size={24}/>
        </button>
      </nav>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default ForecastScreen;
