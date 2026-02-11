import React, { useEffect, useState } from 'react';
import { X, Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, Calendar, Clock } from 'lucide-react';

interface WeatherModalProps {
    weather: any;
    locationName: string;
    onClose: () => void;
}

const WeatherModal: React.FC<WeatherModalProps> = ({ weather, locationName, onClose }) => {
    const [bgClass, setBgClass] = useState('bg-gradient-to-b from-blue-400 to-blue-800');

    useEffect(() => {
        if (!weather?.current) return;
        const isDay = weather.current.is_day;
        const code = weather.current.weather_code;

        if (!isDay) setBgClass('bg-gradient-to-b from-slate-900 via-slate-800 to-black'); // Night
        else if (code >= 51) setBgClass('bg-gradient-to-b from-slate-600 via-slate-500 to-slate-800'); // Rain
        else if (code >= 1 && code <= 3) setBgClass('bg-gradient-to-b from-blue-400 via-blue-500 to-blue-800'); // Cloudy
        else setBgClass('bg-gradient-to-b from-sky-400 via-sky-600 to-blue-900'); // Sunny
    }, [weather]);

    if (!weather) return null;

    // Helper to format hourly time
    const formatHour = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: 'numeric', hour12: true });
    };

    // Helper to map WMO codes to text (duplicate logic, could be in utils)
    const getWeatherDescription = (code: number) => {
        if (code === 0) return "Clear";
        if (code === 1 || code === 2 || code === 3) return "Partly Cloudy";
        if (code >= 51) return "Rain";
        return "Sunny";
    };

    const currentTemp = Math.round(weather.current.temperature_2m);
    const highTemp = Math.round(weather.daily.temperature_2m_max[0]);
    const lowTemp = Math.round(weather.daily.temperature_2m_min[0]);

    // Get next 24 hours of data
    const currentHourIndex = new Date().getHours();
    // Simplified slicing for demo - assumes hourly data starts from 00:00 today
    const hourlyData = weather.hourly?.time?.slice(currentHourIndex, currentHourIndex + 24).map((time: string, i: number) => ({
        time,
        // If i === 0 (Now), use the current temp to match the big display
        temp: i === 0 ? weather.current.temperature_2m : weather.hourly.temperature_2m[currentHourIndex + i],
        code: weather.hourly.weather_code[currentHourIndex + i]
    })) || [];

    return (
        <div className={`fixed inset-0 z-[100] ${bgClass} text-white flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden`}>
            {/* CSS Animations */}
            <style>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.2; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                @keyframes float {
                    0% { transform: translateX(-10px); }
                    50% { transform: translateX(10px); }
                    100% { transform: translateX(-10px); }
                }
                @keyframes rain-fall {
                    0% { transform: translateY(-20px); opacity: 0; }
                    10% { opacity: 1; }
                    100% { transform: translateY(100vh); opacity: 0; }
                }
                @keyframes cloud-move {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100vw); }
                }
            `}</style>

            {/* Background Animations */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Stars (Night) */}
                {!weather.current.is_day && Array.from({ length: 50 }).map((_, i) => (
                    <div
                        key={`star-${i}`}
                        className="absolute bg-white rounded-full"
                        style={{
                            top: `${Math.random() * 60}%`,
                            left: `${Math.random() * 100}%`,
                            width: `${Math.random() * 3}px`,
                            height: `${Math.random() * 3}px`,
                            animation: `twinkle ${2 + Math.random() * 3}s infinite ease-in-out ${Math.random() * 2}s`
                        }}
                    />
                ))}

                {/* Rain (Rainy) */}
                {weather.current.weather_code >= 51 && Array.from({ length: 100 }).map((_, i) => (
                    <div
                        key={`rain-${i}`}
                        className="absolute bg-blue-200/30 w-[1px]"
                        style={{
                            height: `${10 + Math.random() * 20}px`,
                            left: `${Math.random() * 100}%`,
                            top: -10,
                            animation: `rain-fall ${0.5 + Math.random()}s infinite linear ${Math.random() * 2}s`
                        }}
                    />
                ))}

                {/* Moving Clouds (Cloudy) */}
                {(weather.current.weather_code === 1 || weather.current.weather_code === 2 || weather.current.weather_code === 3) && (
                    <>
                        <div className="absolute top-20 left-0 opacity-20" style={{ animation: 'cloud-move 60s infinite linear' }}>
                            <Cloud size={200} fill="currentColor" />
                        </div>
                        <div className="absolute top-40 left-0 opacity-10" style={{ animation: 'cloud-move 40s infinite linear reverse' }}>
                            <Cloud size={150} fill="currentColor" />
                        </div>
                    </>
                )}
            </div>

            {/* Header */}
            <div className="flex justify-between items-center p-6 pt-12 relative z-10">
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full backdrop-blur-md active:scale-95 transition-transform">
                    <X size={24} />
                </button>
                <span className="font-medium text-lg tracking-wide">{locationName}</span>
                <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto pb-20 no-scrollbar relative z-10">
                {/* Main Info */}
                <div className="flex flex-col items-center justify-center -mt-4 mb-8">
                    <div className="text-8xl font-thin tracking-tighter mb-2 drop-shadow-lg">
                        {currentTemp}°
                    </div>
                    <div className="text-xl font-medium text-white/90 mb-1">
                        {getWeatherDescription(weather.current.weather_code)}
                    </div>
                    <div className="text-sm font-medium text-white/70">
                        H:{highTemp}°  L:{lowTemp}°
                    </div>
                </div>

                {/* Hourly Forecast */}
                <div className="mx-6 p-4 bg-white/10 backdrop-blur-3xl rounded-3xl border border-white/20 mb-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2 text-xs font-bold text-white/70 uppercase tracking-wider">
                        <Clock size={14} /> 24-Hour Forecast
                    </div>
                    <div className="flex overflow-x-auto gap-6 no-scrollbar pb-2">
                        {hourlyData.map((hour: any, i: number) => (
                            <div key={i} className="flex flex-col items-center gap-2 min-w-[50px]">
                                <span className="text-sm font-medium">{i === 0 ? 'Now' : formatHour(hour.time)}</span>
                                {hour.code > 3 ? <CloudRain size={20} className="text-blue-300" /> : <Sun size={20} className="text-yellow-300" />}
                                <span className="text-lg font-bold">{Math.round(hour.temp)}°</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 7-Day Forecast */}
                <div className="mx-6 p-4 bg-white/10 backdrop-blur-3xl rounded-3xl border border-white/20 shadow-lg">
                    <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2 text-xs font-bold text-white/70 uppercase tracking-wider">
                        <Calendar size={14} /> 7-Day Forecast
                    </div>
                    <div className="flex flex-col gap-3">
                        {weather.daily.time.map((time: string, i: number) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="w-16 font-medium text-lg">
                                    {i === 0 ? 'Today' : new Date(time).toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                                <div className="flex-1 flex justify-center">
                                    {weather.daily.weather_code[i] > 3 ? <CloudRain size={20} className="text-blue-300" /> : <Sun size={20} className="text-yellow-300" />}
                                </div>
                                <div className="w-24 flex justify-end gap-3 font-medium">
                                    <span className="text-white/60">{Math.round(weather.daily.temperature_2m_min[i])}°</span>
                                    <div className="w-20 h-1 bg-white/20 rounded-full self-center relative overflow-hidden">
                                        {/* Simplified bar */}
                                        <div className="absolute inset-y-0 left-2 right-2 bg-gradient-to-r from-green-300 to-yellow-300 rounded-full opacity-80" />
                                    </div>
                                    <span>{Math.round(weather.daily.temperature_2m_max[i])}°</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Details Grid */}
                <div className="mx-6 mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-3xl rounded-2xl p-4 border border-white/20 shadow-lg">
                        <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase mb-2">
                            <Thermometer size={14} /> UV Index
                        </div>
                        <div className="text-2xl font-bold">{weather.daily.uv_index_max?.[0] || 'N/A'}</div>
                        <div className="text-xs text-white/70 mt-1">Moderate</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-3xl rounded-2xl p-4 border border-white/20 shadow-lg">
                        <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase mb-2">
                            <Wind size={14} /> Wind
                        </div>
                        <div className="text-2xl font-bold">12 <span className="text-base font-normal">km/h</span></div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-3xl rounded-2xl p-4 border border-white/20 shadow-lg">
                        <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase mb-2">
                            <Droplets size={14} /> Humidity
                        </div>
                        <div className="text-2xl font-bold">{weather.current.relative_humidity_2m}%</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-3xl rounded-2xl p-4 border border-white/20 shadow-lg">
                        <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase mb-2">
                            <Sun size={14} /> Sunset
                        </div>
                        <div className="text-2xl font-bold">{weather.daily.sunset?.[0] ? formatHour(weather.daily.sunset[0]) : 'N/A'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeatherModal;
