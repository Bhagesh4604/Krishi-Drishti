import React from 'react';
import { Screen, UserProfile } from '../types';
import { ArrowLeft, CloudRain, Wind, Droplets, Sun, Thermometer, AlertCircle, Clock } from 'lucide-react';

const C = { primary: '#00BB78', dark: '#001A11', gray: '#616B68', mint: '#A5FFA7', bg: '#E8FBF3' };

interface ForecastScreenProps {
  navigateTo: (screen: Screen) => void;
  t: any;
  weather?: any;
  user?: UserProfile | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getWeatherIcon = (code: number) => {
  if (code === 0) return <Sun size={18} className="text-yellow-500" />;
  if (code <= 3) return <Sun size={18} className="text-yellow-400" />;
  if (code <= 67) return <CloudRain size={18} className="text-blue-500" />;
  return <CloudRain size={18} className="text-gray-500" />;
};

const getWeatherLabel = (code: number) => {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Fog';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  return 'Storm';
};

const ForecastScreen: React.FC<ForecastScreenProps> = ({ navigateTo, t, weather, user }) => {
  // Extract real 7-day forecast from Open-Meteo weather data
  const daily = weather?.daily;
  const hasForecast = daily?.time && daily.time.length > 0;

  const crops = Array.isArray(user?.crops) && user!.crops.length > 0
    ? user!.crops
    : null;

  return (
    <div className="bg-white min-h-full pb-28" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ─── HEADER ─── */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3 sticky top-0 bg-white z-10" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <button
          onClick={() => navigateTo('home')}
          className="w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-transform"
          style={{ background: '#F5F5F5', border: '1px solid #EBEBEB' }}
        >
          <ArrowLeft size={16} style={{ color: C.dark }} />
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: C.dark }}>7-Day Weather Forecast</h1>
          <p className="text-xs font-semibold" style={{ color: C.primary }}>
            Real data via Open-Meteo
          </p>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">

        {/* ─── 7-DAY WEATHER CARDS ─── */}
        {hasForecast ? (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Weekly Outlook</p>
            <div className="space-y-2">
              {daily.time.slice(0, 7).map((date: string, i: number) => {
                const dayName = WEEKDAYS[new Date(date).getDay()];
                const maxTemp = Math.round(daily.temperature_2m_max?.[i] ?? '--');
                const minTemp = Math.round(daily.temperature_2m_min?.[i] ?? '--');
                const rain = daily.precipitation_sum?.[i]?.toFixed(1) ?? '0';
                const code = daily.weathercode?.[i] ?? 0;
                const windSpeed = Math.round(daily.windspeed_10m_max?.[i] ?? 0);
                const isToday = i === 0;

                return (
                  <div
                    key={date}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{
                      background: isToday ? C.bg : '#FAFAFA',
                      border: `1px solid ${isToday ? C.mint : '#F0F0F0'}`
                    }}
                  >
                    <div className="w-10 text-center">
                      <p className="text-xs font-bold" style={{ color: isToday ? C.primary : C.gray }}>
                        {isToday ? 'Today' : dayName}
                      </p>
                      <p className="text-[10px] text-gray-400">{date.slice(5)}</p>
                    </div>

                    <div className="w-8 flex justify-center">
                      {getWeatherIcon(code)}
                    </div>

                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-700">{getWeatherLabel(code)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                          <Droplets size={9} /> {rain}mm
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Wind size={9} /> {windSpeed}km/h
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: C.dark }}>{maxTemp}°</p>
                      <p className="text-xs text-gray-400">{minTemp}°</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 gap-3 rounded-2xl" style={{ background: '#FAFAFA', border: '1px solid #F0F0F0' }}>
            <Clock size={32} className="text-gray-300" />
            <p className="text-sm font-semibold text-gray-500">Loading weather data...</p>
            <p className="text-xs text-gray-400">Allow location access for accurate forecast</p>
          </div>
        )}

        {/* ─── FARMING ADVISORY BASED ON WEATHER ─── */}
        {hasForecast && (() => {
          const totalRain = daily.precipitation_sum?.slice(0, 7).reduce((a: number, b: number) => a + b, 0) ?? 0;
          const maxWind = Math.max(...(daily.windspeed_10m_max?.slice(0, 7) ?? [0]));
          const avgMax = (daily.temperature_2m_max?.slice(0, 7).reduce((a: number, b: number) => a + b, 0) ?? 0) / 7;

          const advisories: { icon: React.ReactNode; title: string; desc: string; color: string }[] = [];

          if (totalRain > 20) {
            advisories.push({
              icon: <CloudRain size={16} className="text-blue-600" />,
              title: 'Heavy Rain Expected',
              desc: `${totalRain.toFixed(0)}mm total this week. Delay any spraying or harvesting if possible.`,
              color: 'bg-blue-50 border-blue-100',
            });
          }
          if (maxWind > 40) {
            advisories.push({
              icon: <Wind size={16} className="text-gray-600" />,
              title: 'High Wind Alert',
              desc: `Winds up to ${Math.round(maxWind)} km/h. Secure any nets or poly-house structures.`,
              color: 'bg-gray-50 border-gray-200',
            });
          }
          if (avgMax > 38) {
            advisories.push({
              icon: <Thermometer size={16} className="text-red-500" />,
              title: 'Heat Stress Risk',
              desc: `Average high of ${Math.round(avgMax)}°C. Irrigate early morning or late evening to reduce crop stress.`,
              color: 'bg-red-50 border-red-100',
            });
          }
          if (totalRain < 2 && avgMax > 30) {
            advisories.push({
              icon: <Droplets size={16} className="text-orange-500" />,
              title: 'Dry Week Ahead',
              desc: 'Less than 2mm rain expected. Ensure irrigation is scheduled for your plots.',
              color: 'bg-orange-50 border-orange-100',
            });
          }

          if (advisories.length === 0) return (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-green-50 border border-green-100">
              <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <Sun size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-900">Good Week for Farming</p>
                <p className="text-xs text-green-700 mt-0.5">No extreme weather events expected. Ideal conditions for field work.</p>
              </div>
            </div>
          );

          return (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Farming Advisories</p>
              <div className="space-y-3">
                {advisories.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border ${a.color}`}>
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      {a.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{a.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ─── PRICE FORECAST — HONEST PLACEHOLDER ─── */}
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <AlertCircle size={16} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-700">Mandi Price Forecast</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Live Agmarknet price API integration is in progress. Once connected, you'll see real-time mandi prices for{' '}
              {crops ? crops.join(', ') : 'your crops'} here.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ForecastScreen;
