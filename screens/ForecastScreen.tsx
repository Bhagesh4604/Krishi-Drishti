import React, { useState, useEffect, useRef } from 'react';
import { Screen, UserProfile } from '../types';
import { MapPin, List, Wind, Droplets, Eye, Gauge, Thermometer, Sun, ArrowLeft, CloudRain, Cloud, CloudSnow, CloudLightning, Moon, CalendarDays } from 'lucide-react';

interface ForecastScreenProps {
  navigateTo: (screen: Screen) => void;
  t: any;
  weather?: any;
  user?: UserProfile | null;
  locationName?: string;
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── WMO code → label + theme ────────────────────────────────────────────────
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

const getWeatherIcon = (code: number, isDay = 1, size = 24) => {
  const y = "#ffeb3b"; 
  const lc = "#d1d5db"; 
  const dc = "#9ca3af"; 
  const b = "#60a5fa"; 
  const w = "#ffffff"; 

  const cloudPath = "M 7.5,17 A 4.5,4.5 0 0 1 7.5,8 A 6,6 0 0 1 17.5,9 A 4,4 0 0 1 17.5,17 Z";
  
  const rainDrops = (
    <g stroke={b} strokeWidth="2" strokeLinecap="round">
      <path d="M 8,19 l -1.5,3" />
      <path d="M 12.5,19 l -1.5,3" />
      <path d="M 17,19 l -1.5,3" />
    </g>
  );

  const lightningBolt = <path d="M12.5 12 l -2.5 5 l 5 -6 h -3.5 l 2.5 -4 l -5 5 h 3.5 z" fill={w} />;

  const snowFlakes = (
    <g stroke={w} strokeWidth="1.5" strokeLinecap="round">
      <path d="M 12,17 v 6 M 9.5,18.5 l 5,3 M 14.5,18.5 l -5,3" />
    </g>
  );

  const star = (cx: number, cy: number, r: number) => (
    <path d={`M ${cx},${cy-r} Q ${cx},${cy} ${cx+r},${cy} Q ${cx},${cy} ${cx},${cy+r} Q ${cx},${cy} ${cx-r},${cy} Q ${cx},${cy} ${cx},${cy-r} Z`} fill={w} />
  );

  const sunRays = (
    <g stroke={y} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.5" fill={y} stroke="none" />
      <path d="M12 4v1.5 M12 18.5v1.5 M4 12h1.5 M18.5 12h1.5 M6.3 6.3l1.1 1.1 M16.6 16.6l1.1 1.1 M16.6 7.4l-1.1 1.1 M7.4 16.6l-1.1-1.1" />
    </g>
  );

  const moon = <path d="M19 13.5 A 6 6 0 1 1 10.5 5 A 6 6 0 0 0 19 13.5 Z" fill={w} />;

  if (code === 100) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <g stroke={lc} strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M 5,8 h 9 c 1.5,0 3,-1 3,-2.5 s -1.5,-2.5 -3,-2.5 s -2,1 -2,1.5" />
        <path d="M 3,13 h 12 c 2,0 4,-1 4,-3 s -2,-3 -4,-3 s -2.5,1 -2.5,2" />
        <path d="M 7,18 h 6 c 1.5,0 3,1 3,2.5 s -1.5,2.5 -3,2.5 s -2,-1 -2,-1.5" />
      </g>
    </svg>
  );

  if (code === 0) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {isDay ? sunRays : (
        <g>
          {moon}
          {star(17, 6, 2)}
          {star(6, 9, 1.5)}
        </g>
      )}
    </svg>
  );

  if (code <= 2) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {isDay ? (
        <g transform="translate(-3, -3) scale(0.8)">
          {sunRays}
        </g>
      ) : (
        <g transform="translate(4, -5) scale(0.85)">
          {moon}
          {star(17, 5, 2)}
        </g>
      )}
      <path d={cloudPath} fill={lc} />
    </svg>
  );

  if (code === 3) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={cloudPath} fill={lc} />
    </svg>
  );

  if (code === 45 || code === 48) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={cloudPath} fill={lc} />
      <g stroke={lc} strokeWidth="2" strokeLinecap="round">
        <path d="M 7,20 h 10 M 9,22 h 6" />
      </g>
    </svg>
  );

  if (code <= 67 || (code >= 80 && code <= 82)) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={cloudPath} fill={lc} />
      {rainDrops}
    </svg>
  );

  if (code <= 77 || code === 85 || code === 86) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={cloudPath} fill={dc} />
      {snowFlakes}
    </svg>
  );

  if (code >= 95) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={cloudPath} fill={dc} />
      {lightningBolt}
    </svg>
  );

  return <Thermometer size={size} color="white" />;
};

// ─── Procedural Live Weather Background ────────────────────────────────────
const WeatherLiveBackground: React.FC<{ theme: string }> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0;
    
    let stars: any[] = [];
    let rain: any[] = [];
    let snow: any[] = [];
    
    const init = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      stars = Array.from({length: 150}).map(() => ({
        x: Math.random() * W, y: Math.random() * H * 0.8,
        r: Math.random() * 1.5, a: Math.random(), v: 0.005 + Math.random() * 0.015
      }));
      rain = Array.from({length: 120}).map(() => ({
        x: Math.random() * W, y: Math.random() * H,
        l: 15 + Math.random() * 20, v: 15 + Math.random() * 15
      }));
      snow = Array.from({length: 100}).map(() => ({
        x: Math.random() * W, y: Math.random() * H,
        r: 1 + Math.random() * 2.5, v: 1 + Math.random() * 2,
        vx: (Math.random() - 0.5) * 1, a: Math.random() * Math.PI * 2
      }));
    };
    
    window.addEventListener('resize', init);
    init();
    
    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;
      
      if (['clear-night', 'partly-cloudy'].includes(theme)) {
        stars.forEach(s => {
          s.a += s.v;
          if (s.a > 1 || s.a < 0.1) s.v *= -1;
          ctx.globalAlpha = Math.max(0.1, Math.min(1, s.a));
          ctx.fillStyle = 'white';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      
      if (['rain', 'thunder'].includes(theme)) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        rain.forEach(r => {
          r.y += r.v;
          r.x += r.v * 0.2; 
          if (r.y > H) { r.y = -r.l; r.x = Math.random() * W - H * 0.2; }
          ctx.moveTo(r.x, r.y);
          ctx.lineTo(r.x - r.v * 0.2, r.y - r.l);
        });
        ctx.stroke();
      }
      
      if (theme === 'thunder' && Math.random() < 0.01) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, 0, W, H);
      }
      
      if (theme === 'snow') {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        snow.forEach(s => {
          s.y += s.v;
          s.x += s.vx + Math.sin(frame * 0.02 + s.a) * 0.5;
          if (s.y > H) { s.y = -5; s.x = Math.random() * W; }
          ctx.moveTo(s.x, s.y);
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        });
        ctx.fill();
      }
      
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', init); };
  }, [theme]);
  
  const getSkyGradient = () => {
    switch (theme) {
      case 'clear-day': return 'linear-gradient(180deg, #1e4b9b 0%, #3e81ca 50%, #7bbbee 100%)';
      case 'clear-night': return 'linear-gradient(180deg, #0b1021 0%, #1b2640 50%, #2f4060 100%)';
      case 'partly-cloudy': return 'linear-gradient(180deg, #376aab 0%, #5d97d3 50%, #8ac0ef 100%)';
      case 'cloudy': return 'linear-gradient(180deg, #5b6976 0%, #7b8e9d 50%, #9baebd 100%)';
      case 'rain': return 'linear-gradient(180deg, #2b3543 0%, #3b4a5d 50%, #4a5c71 100%)';
      case 'thunder': return 'linear-gradient(180deg, #1f232c 0%, #2a313e 50%, #343c4a 100%)';
      case 'snow': return 'linear-gradient(180deg, #7c8e9d 0%, #9cb1c2 50%, #b8ccdb 100%)';
      case 'fog': return 'linear-gradient(180deg, #8b99a6 0%, #a4b2be 50%, #bdcace 100%)';
      default: return 'linear-gradient(180deg, #1e4b9b 0%, #3e81ca 50%, #7bbbee 100%)';
    }
  };
  
  const showClouds = ['clear-day', 'partly-cloudy', 'cloudy', 'rain', 'snow', 'thunder'].includes(theme);
  
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Apple-style Gradient Background */}
      <div style={{ position: 'absolute', inset: 0, background: getSkyGradient(), transition: 'background 2s ease' }} />
      
      {/* Parallax Drifting Clouds */}
      {showClouds && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
          <svg className="cloud-drift c1" width="300" height="150" viewBox="0 0 24 24" fill="white" opacity="0.4" style={{ position: 'absolute', top: '5%' }}>
            <path d="M 7.5,17 A 4.5,4.5 0 0 1 7.5,8 A 6,6 0 0 1 17.5,9 A 4,4 0 0 1 17.5,17 Z"/>
          </svg>
          <svg className="cloud-drift c2" width="200" height="100" viewBox="0 0 24 24" fill="white" opacity="0.25" style={{ position: 'absolute', top: '18%' }}>
            <path d="M 7.5,17 A 4.5,4.5 0 0 1 7.5,8 A 6,6 0 0 1 17.5,9 A 4,4 0 0 1 17.5,17 Z"/>
          </svg>
          <svg className="cloud-drift c3" width="450" height="225" viewBox="0 0 24 24" fill="white" opacity="0.15" style={{ position: 'absolute', top: '2%' }}>
            <path d="M 7.5,17 A 4.5,4.5 0 0 1 7.5,8 A 6,6 0 0 1 17.5,9 A 4,4 0 0 1 17.5,17 Z"/>
          </svg>
        </div>
      )}

      {/* Particle Canvas on top (Rain/Snow/Stars) */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }} />
      
      <style>{`
        .cloud-drift { animation: drift linear infinite; left: -500px; }
        .c1 { animation-duration: 70s; animation-delay: -20s; }
        .c2 { animation-duration: 45s; animation-delay: -10s; }
        .c3 { animation-duration: 100s; animation-delay: -60s; }
        @keyframes drift {
          from { transform: translateX(0); }
          to { transform: translateX(calc(100vw + 600px)); }
        }
      `}</style>
    </div>
  );
};

const getThemeBg = (theme: string) => {
  switch (theme) {
    case 'clear-day':     return 'linear-gradient(180deg, #1565c0 0%, #1e88e5 25%, #42a5f5 55%, #64b5f6 80%, #90caf9 100%)';
    case 'clear-night':   return 'linear-gradient(180deg, #020817 0%, #0d1b3e 40%, #1a2b5e 100%)';
    case 'partly-cloudy': return 'linear-gradient(180deg, #1976d2 0%, #2196f3 30%, #42a5f5 65%, #64b5f6 100%)';
    case 'cloudy':        return 'linear-gradient(180deg, #37474f 0%, #455a64 40%, #546e7a 70%, #607d8b 100%)';
    case 'rain':          return 'linear-gradient(180deg, #1a2026 0%, #2c3540 50%, #44515f 100%)';
    case 'thunder':       return 'linear-gradient(180deg, #0a0e14 0%, #141c28 40%, #1e2a3c 100%)';
    case 'snow':          return 'linear-gradient(180deg, #5c7a99 0%, #6e8fad 40%, #8aaabb 100%)';
    case 'fog':           return 'linear-gradient(180deg, #6b7280 0%, #7d8a96 40%, #90979f 100%)';
    default:              return 'linear-gradient(180deg, #37474f 0%, #455a64 40%, #546e7a 100%)';
  }
};

const getWindDir = (deg: number) => {
  const d = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return d[Math.round(deg / 22.5) % 16];
};

// ─── Light translucent glass panel (matches Apple Weather exactly) ───────────
const Glass: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> =
  ({ children, className='', style={} }) => {
  return (
  <div className={`rounded-3xl overflow-hidden ${className}`} style={{
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(30px) saturate(120%)',
    WebkitBackdropFilter: 'blur(30px) saturate(120%)',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    ...style
  }}>{children}</div>
);};

// ─── Section header row ────────────────────────────────────────────────────
const SectionHeader: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="px-4 py-3 flex items-center gap-2"
    style={{ borderBottom:'1px solid rgba(255,255,255,0.2)' }}>
    <span style={{ color:'rgba(255,255,255,0.6)', display:'flex' }}>{icon}</span>
    <span className="text-[13px] font-semibold tracking-wide uppercase"
      style={{ color:'rgba(255,255,255,0.6)' }}>{label}</span>
  </div>
);

// ─── Temperature range bar (Apple warm amber style) ────────────────────────
const TempBar: React.FC<{
  low: number; high: number; globalMin: number; globalMax: number; current?: number | null;
}> = ({ low, high, globalMin, globalMax, current }) => {
  const range = Math.max(globalMax - globalMin, 1);
  const left  = ((low  - globalMin) / range) * 100;
  const width = Math.max(((high - low) / range) * 100, 8);
  const dotLeft = current != null && high > low
    ? ((current - low) / (high - low)) * 100 : null;
  return (
    <div className="flex-1 mx-3 relative" style={{ height:5, borderRadius:999, background:'rgba(0,0,0,0.15)' }}>
      <div style={{
        position:'absolute', height:'100%', borderRadius:999,
        left:`${left}%`, width:`${width}%`,
        background:'linear-gradient(90deg, #f7a135 0%, #f5c518 50%, #f97316 100%)'
      }}>
        {dotLeft != null && (
          <div style={{
            position:'absolute', top:'50%', transform:'translate(-50%,-50%)',
            left:`${Math.min(Math.max(dotLeft,4),96)}%`,
            width:10, height:10, borderRadius:'50%', background:'white',
            boxShadow:'0 0 5px rgba(0,0,0,0.4)', zIndex:2
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
          textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontWeight="600">{l}</text>;
      })}
      <g transform={`rotate(${deg},50,50)`}>
        <polygon points="50,14 53,44 50,47 47,44" fill="white" opacity="0.95"/>
        <circle cx="50" cy="50" r="3" fill="white"/>
        <polygon points="50,86 53,56 50,53 47,56" fill="rgba(255,255,255,0.25)"/>
      </g>
      <text x="50" y="47" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">{Math.round(speed)}</text>
      <text x="50" y="57" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">kph</text>
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
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" strokeLinecap="round"/>
      {Array.from({length:11}).map((_,i)=>{
        const a=(-130+(i/10)*260)*Math.PI/180;
        return <line key={i} x1={50+30*Math.cos(a)} y1={52+30*Math.sin(a)} x2={50+37*Math.cos(a)} y2={52+37*Math.sin(a)}
          stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>;
      })}
      <line x1="50" y1="52" x2={nx} y2={ny} stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="50" cy="52" r="3.5" fill="white"/>
      <text x="50" y="44" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">{Math.round(hPa).toLocaleString()}</text>
      <text x="50" y="55" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8">hPa</text>
      <text x="12" y="68" fill="rgba(255,255,255,0.5)" fontSize="9">Low</text>
      <text x="78" y="68" fill="rgba(255,255,255,0.5)" fontSize="9">High</text>
    </svg>
  );
};

// ─── Sun arc ──────────────────────────────────────────────────────────────
const SunArc: React.FC<{ sunrise: string; sunset: string }> = ({ sunrise, sunset }) => {
  const now=Date.now(), sr=new Date(sunrise).getTime(), ss=new Date(sunset).getTime();
  const p  = Math.min(Math.max((now-sr)/(ss-sr),0),1);
  const toR= (d:number)=>d*Math.PI/180;
  const cx=60, cy=55, r=40;
  const saR=toR(210), eaR=toR(330);
  const sx=cx+r*Math.cos(saR), sy=cy+r*Math.sin(saR);
  const ex=cx+r*Math.cos(eaR), ey=cy+r*Math.sin(eaR);
  const aR=toR(210+p*120);
  const sunX=cx+r*Math.cos(aR), sunY=cy+r*Math.sin(aR);
  return (
    <svg width="120" height="65" viewBox="0 0 120 65">
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`}
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5"/>
      {p>0&&<path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${sunX} ${sunY}`}
        fill="none" stroke="white" strokeWidth="2.5"/>}
      <circle cx={sunX} cy={sunY} r="4" fill="white"/>
      <circle cx={sunX} cy={sunY} r="7" fill="rgba(255,255,255,0.3)"/>
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

  const themeBgFallback = getThemeBg(cond.theme);

  const getSummary = () => {
    const gusts = Math.round(windGusts);
    const rainH = hourSlice.findIndex((_:any,i:number)=>(hourly?.precipitation_probability?.[hStart+i]??0)>=40);
    const parts: string[] = [];
    if (rainH >= 0) {
      const h = new Date(hourSlice[rainH]).getHours();
      parts.push(`Rainy conditions expected around ${h>12?h-12+'PM':h+'AM'}.`);
    }
    if (gusts > 40) parts.push(`Wind gusts are up to ${gusts} kph.`);
    if (!parts.length) parts.push(`${cond.label} conditions expected today.`);
    return parts.join(' ');
  };

  const uvLabel = uvIndex<=2?'Low':uvIndex<=5?'Moderate':uvIndex<=7?'High':uvIndex<=10?'Very High':'Extreme';
  const uvTip   = uvIndex<=2?'No protection needed.':uvIndex<=5?'Use sun protection until 4PM.':uvIndex<=7?'Seek shade during peak hours.':'Avoid sun 10AM–4PM.';

  const locParts = locationName ? locationName.split(',') : [];
  const city = locParts[0]?.trim() || 'My Location';
  const district = locParts[1]?.trim() || 'CURRENT LOCATION';

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
    <div style={{ position:'relative', height:'100vh', overflow:'hidden', background: themeBgFallback,
      fontFamily:'-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>

      {/* ── Procedural Live Background ── */}
      <div style={{ position:'absolute', inset:0, zIndex:0 }}>
        <WeatherLiveBackground theme={cond.theme} />
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ position:'relative', zIndex:10, height:'100vh', overflowY:'auto', paddingBottom:100 }}
        className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        {/* Back button */}
        <button onClick={()=>navigateTo('home')}
          style={{ position:'absolute', top:52, left:16, zIndex:20, width:34, height:34,
            borderRadius:'50%', background:'rgba(255,255,255,0.2)', backdropFilter:'blur(10px)',
            border:'1px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ArrowLeft size={18} color="white"/>
        </button>

        {/* ════ HERO ════ */}
        <header style={{ paddingTop:84, paddingBottom:40, textAlign:'center' }}>
          <p style={{ fontSize:15, fontWeight:500, letterSpacing:'0.05em', color:'white',
            textTransform:'uppercase', marginBottom:0, textShadow:'0 1px 4px rgba(0,0,0,0.3)' }}>{district}</p>
          <h1 style={{ fontSize:42, fontWeight:300, color:'white', margin:'0 0 4px',
            textShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
            {city}
          </h1>
          {temp !== null ? (
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 20, fontWeight: 500, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)', marginTop: 4 }}>
               <span>{temp}°</span>
               <span style={{ opacity: 0.8 }}>|</span>
               <span>{cond.label}</span>
             </div>
          ) : (
            <div style={{ display:'flex', justifyContent:'center', margin:'24px 0' }}>
              <div style={{ width:30, height:30, borderRadius:'50%',
                border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'white',
                animation:'spin 1.2s linear infinite' }}/>
            </div>
          )}
        </header>

        <div style={{ padding:'0 16px', maxWidth:640, margin:'0 auto', display:'flex', flexDirection:'column', gap:12 }}>

          {/* ════ HOURLY ════ */}
          {has && (
            <Glass>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.2)' }}>
                <p style={{ fontSize:15, fontWeight:500, color:'white', lineHeight:1.4, margin:0, textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{getSummary()}</p>
              </div>
              <div style={{ overflowX:'auto', display:'flex', padding:'12px 16px', gap:28, scrollbarWidth:'none' }}>
                {[
                  { label: 'Now', temp: temp, code: code, pop: precip > 0 ? 100 : 0, isDay, windSpeed: typeof windSpeed === 'number' ? windSpeed : 0 },
                  ...hourSlice.map((ts: string, i: number) => {
                    const hr = new Date(ts).getHours();
                    return {
                      label: hr === 0 ? '12AM' : hr < 12 ? `${hr}AM` : hr === 12 ? '12PM' : `${hr - 12}PM`,
                      temp: hourly?.temperature_2m?.[hStart + i],
                      code: hourly?.weather_code?.[hStart + i] ?? 0,
                      pop: hourly?.precipitation_probability?.[hStart + i] ?? 0,
                      isDay: hourly?.is_day?.[hStart + i] ?? 1,
                      windSpeed: hourly?.wind_speed_10m?.[hStart + i] ?? 0
                    };
                  })
                ].slice(0, 24).map((item, i) => {
                  const finalCode = (item.windSpeed > 30 && item.pop < 20) ? 100 : item.code;
                  return (
                  <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:40, gap:8 }}>
                    <span style={{ fontSize:16, fontWeight:500, color: 'white', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{item.label}</span>
                    <span style={{ filter:'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}>{getWeatherIcon(finalCode, item.isDay, 28)}</span>
                    <div style={{ height:14, display:'flex', alignItems:'center' }}>
                      {item.pop > 0 && <span style={{ fontSize:13, fontWeight:600, color:'#7dd3fc', textShadow:'0 1px 2px rgba(0,0,0,0.3)' }}>{item.pop}%</span>}
                    </div>
                    <span style={{ fontSize:18, fontWeight:500, color:'white', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>
                      {item.temp !== undefined && item.temp !== null ? Math.round(item.temp) : '--'}°
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
              <SectionHeader icon={<CalendarDays size={16}/>} label="10-Day Forecast"/>
              <div style={{ padding:'4px 16px' }}>
                {daily.time.slice(0,10).map((date:string,i:number)=>{
                  let dc = daily.weather_code?.[i] ?? 0;
                  const dMax = Math.round(daily.temperature_2m_max?.[i]??0);
                  const dMin = Math.round(daily.temperature_2m_min?.[i]??0);
                  const dP   = daily.precipitation_probability_max?.[i]??0;
                  const dWind = daily.wind_speed_10m_max?.[i]??0;
                  if (dWind > 30 && dP < 20) dc = 100;
                  const label= i===0?'Today':SHORT_DAYS[new Date(date).getDay()];
                  return (
                    <div key={date} style={{ display:'flex', alignItems:'center', padding:'12px 0',
                      borderBottom: i<9?'1px solid rgba(255,255,255,0.2)':'none' }}>
                      <span style={{ width:60, fontSize:19, fontWeight:500, color:'white', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{label}</span>
                      <div style={{ width:48, display:'flex', flexDirection:'column', alignItems:'center', filter:'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}>
                        {getWeatherIcon(dc, 1, 24)}
                        {dP > 0 && <span style={{ fontSize:13, fontWeight:600, color:'#7dd3fc', marginTop:2, textShadow:'0 1px 2px rgba(0,0,0,0.3)' }}>{dP}%</span>}
                      </div>
                      <span style={{ fontSize:19, fontWeight:500, color:'rgba(255,255,255,0.8)', width:40, textAlign:'right', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{dMin}°</span>
                      <TempBar low={dMin} high={dMax} globalMin={gMin} globalMax={gMax}
                        current={i===0?temp:undefined}/>
                      <span style={{ fontSize:19, fontWeight:500, color:'white', width:40, textAlign:'right', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{dMax}°</span>
                    </div>
                  );
                })}
              </div>
            </Glass>
          )}

          {/* ════ WIND ════ */}
          {has && (
            <Glass>
              <SectionHeader icon={<Wind size={16}/>} label="Wind"/>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {([['Wind', `${windSpeed} kph`],['Gusts',`${Math.round(windGusts)} kph`],['Direction',`${Math.round(windDir)}° ${getWindDir(windDir)}`]] as [string,string][]).map(([k,v])=>(
                    <div key={k}>
                      <div style={{ display:'flex', alignItems:'baseline', gap:20 }}>
                        <span style={{ fontSize:14, color:'rgba(255,255,255,0.8)', width:80, textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{k}</span>
                        <span style={{ fontSize:16, fontWeight:600, color:'white', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{v}</span>
                      </div>
                      <div style={{ marginTop:8, width:200, height:1, background:'rgba(255,255,255,0.2)' }}/>
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
                <div style={{ padding:'16px' }}>
                  <SectionHeader icon={<Sun size={15}/>} label="UV Index"/>
                  <div style={{ padding:'12px 0 4px' }}>
                    <p style={{ fontSize:40, fontWeight:300, color:'white', margin:'0 0 2px', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{Math.round(uvIndex)}</p>
                    <p style={{ fontSize:17, fontWeight:600, color:'white', margin:'0 0 16px', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{uvLabel}</p>
                    <div style={{ height:7, borderRadius:999, position:'relative', marginBottom:12,
                      background:'linear-gradient(90deg,#4ade80,#facc15,#fb923c,#f87171,#c084fc)' }}>
                      <div style={{ position:'absolute', top:'50%', transform:'translate(-50%,-50%)',
                        left:`${Math.min((uvIndex/11)*100,94)}%`,
                        width:14, height:14, borderRadius:'50%', background:'white',
                        boxShadow:'0 0 6px rgba(0,0,0,0.5)' }}/>
                    </div>
                    <p style={{ fontSize:13, color:'rgba(255,255,255,0.9)', lineHeight:1.4, margin:0, textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{uvTip}</p>
                  </div>
                </div>
              </Glass>
              {daily?.sunset?.[0] && (
                <Glass>
                  <div style={{ padding:'16px' }}>
                    <SectionHeader icon={<Sun size={15}/>} label="Sunset"/>
                    <div style={{ padding:'12px 0 4px' }}>
                      <p style={{ fontSize:28, fontWeight:300, color:'white', margin:'0 0 6px', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>
                        {(()=>{ const d=new Date(daily.sunset[0]); const h=d.getHours(); return `${h>12?h-12:h}:${d.getMinutes().toString().padStart(2,'0')}PM`; })()}
                      </p>
                      <SunArc sunrise={daily.sunrise[0]} sunset={daily.sunset[0]}/>
                      <p style={{ fontSize:13, color:'rgba(255,255,255,0.9)', margin:0, textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>
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
                <div style={{ padding:'16px' }}>
                  <SectionHeader icon={<Droplets size={15}/>} label="Precipitation"/>
                  <p style={{ fontSize:38, fontWeight:300, color:'white', margin:'12px 0 4px', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{precip.toFixed(1)}<span style={{fontSize:18,fontWeight:400}}> mm</span></p>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.9)', marginTop:24, textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>
                    {daily?.precipitation_sum?.[0]?`${daily.precipitation_sum[0].toFixed(1)}mm expected today.`:'In the last hour.'}
                  </p>
                </div>
              </Glass>
              <Glass>
                <div style={{ padding:'16px' }}>
                  <SectionHeader icon={<Eye size={15}/>} label="Visibility"/>
                  <p style={{ fontSize:38, fontWeight:300, color:'white', margin:'12px 0 4px', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{visKm}<span style={{fontSize:18,fontWeight:400}}> km</span></p>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.9)', marginTop:24, textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>
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
                <div style={{ padding:'16px' }}>
                  <SectionHeader icon={<Droplets size={15}/>} label="Humidity"/>
                  <p style={{ fontSize:38, fontWeight:300, color:'white', margin:'12px 0 0', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{humidity}%</p>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.9)', marginTop:32, textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>Dew point {dewPoint}°.</p>
                </div>
              </Glass>
              <Glass>
                <div style={{ padding:'16px' }}>
                  <SectionHeader icon={<Gauge size={15}/>} label="Pressure"/>
                  <div style={{ marginTop:12 }}><PressureGauge hPa={Number(pressure)}/></div>
                </div>
              </Glass>
            </div>
          )}

          {/* ════ FEELS LIKE + AVERAGES ════ */}
          {has && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Glass>
                <div style={{ padding:'16px' }}>
                  <SectionHeader icon={<Thermometer size={15}/>} label="Feels Like"/>
                  <p style={{ fontSize:38, fontWeight:300, color:'white', margin:'12px 0 0', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{feelsLike}°</p>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.9)', marginTop:28, lineHeight:1.4, textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>
                    {Number(feelsLike)<Number(temp)?'Wind makes it feel cooler.':Number(feelsLike)>Number(temp)?'Humidity makes it feel warmer.':'Similar to actual temp.'}
                  </p>
                </div>
              </Glass>
              <Glass>
                <div style={{ padding:'16px' }}>
                  <SectionHeader icon={<span style={{fontSize:14}}>📊</span>} label="Averages"/>
                  {(()=>{
                    const todayMax=daily?.temperature_2m_max?.[0];
                    const avg10=daily?.temperature_2m_max?Math.round(daily.temperature_2m_max.slice(0,10).reduce((a:number,b:number)=>a+b,0)/10):'--';
                    const diff=todayMax?Math.round(todayMax-Number(avg10)):0;
                    return <>
                      <p style={{ fontSize:38, fontWeight:300, color:'white', margin:'12px 0 0', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{diff>0?`+${diff}`:diff}°</p>
                      <p style={{ fontSize:13, color:'rgba(255,255,255,0.9)', margin:'4px 0 16px', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>from avg high</p>
                      {[['Today',`H:${todayMax?Math.round(todayMax):'--'}°`],['10-day avg',`H:${avg10}°`]].map(([k,v])=>(
                        <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                          <span style={{ fontSize:13, color:'rgba(255,255,255,0.8)' }}>{k}</span>
                          <span style={{ fontSize:13, fontWeight:600, color:'white', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{v}</span>
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
              <SectionHeader icon={<span style={{fontSize:15}}>🌫️</span>} label="Air Quality"/>
              <div style={{ padding:'16px' }}>
                {aqi ? (
                  <>
                    <p style={{ fontSize:42, fontWeight:300, color:'white', margin:'0 0 2px', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{aqi.aqi}</p>
                    <p style={{ fontSize:18, fontWeight:600, color:'white', margin:'0 0 16px', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{aqi.label}</p>
                    <div style={{ height:8, borderRadius:999, position:'relative', marginBottom:8,
                      background:'linear-gradient(90deg,#4ade80 0%,#a3e635 15%,#facc15 30%,#fb923c 50%,#f87171 70%,#c084fc 85%,#9333ea 100%)' }}>
                      <div style={{ position:'absolute', top:'50%', transform:'translate(-50%,-50%)',
                        left:`${Math.min((aqi.aqi/300)*100,94)}%`,
                        width:16, height:16, borderRadius:'50%', background:aqi.color, border:'2px solid white',
                        boxShadow:'0 0 8px rgba(0,0,0,0.5)' }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                      {['Good','Mod','USG','Bad','V.Bad','Haz'].map(l=>(
                        <span key={l} style={{ fontSize:10, color:'rgba(255,255,255,0.7)' }}>{l}</span>
                      ))}
                    </div>
                    <p style={{ fontSize:14, color:'rgba(255,255,255,0.9)', lineHeight:1.5, margin:0, textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>
                      AQI {aqi.aqi} — {aqi.label.toLowerCase()} at this time.
                      PM2.5: {aqi.pm2_5}μg/m³ · PM10: {aqi.pm10}μg/m³
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize:14, color:'rgba(255,255,255,0.7)', padding:'8px 0' }}>Fetching air quality…</p>
                )}
              </div>
            </Glass>
          )}

          {/* ════ FARMING ADVISORY ════ */}
          {has && (
            <Glass>
              <SectionHeader icon={<span style={{fontSize:15}}>🌾</span>} label="Farming Advisory"/>
              <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:14 }}>
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
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                      <span style={{ fontSize:20 }}>{icon}</span>
                      <p style={{ fontSize:14, color:'white', lineHeight:1.5, margin:0, textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>{text}</p>
                    </div>
                  ));
                })()}
              </div>
            </Glass>
          )}

          {/* No data */}
          {!has && (
            <Glass style={{ padding:'80px 24px', textAlign:'center' }}>
              <p style={{ fontSize:17, color:'white', margin:0, textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>Loading weather data…</p>
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.7)', marginTop:12 }}>Allow location access for accurate forecast.</p>
            </Glass>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default ForecastScreen;
