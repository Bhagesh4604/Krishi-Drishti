import React, { useState } from 'react';
import { Screen, UserProfile } from '../types';
import {
  ArrowLeft, User, Ruler, Sprout, Tractor, CheckCircle2,
  Sparkles, Leaf, LogOut, MapPin, Loader2, Award, Shield,
  ChevronRight, Star, Edit3
} from 'lucide-react';
import { userService } from '../src/services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileScreenProps {
  onComplete: (profile: UserProfile) => void;
  onLogout?: () => void;
  t: any;
  navigateTo: (screen: Screen) => void;
}

const crops_data = [
  { name: 'Wheat',    emoji: '🌾', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&q=70', color: '#F59E0B' },
  { name: 'Rice',     emoji: '🍚', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&q=70', color: '#10B981' },
  { name: 'Cotton',   emoji: '☁️', image: 'https://images.unsplash.com/photo-1507204689620-eeba92147171?w=300&q=70', color: '#6366F1' },
  { name: 'Tomato',   emoji: '🍅', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&q=70', color: '#EF4444' },
  { name: 'Potato',   emoji: '🥔', image: 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=300&q=70', color: '#D97706' },
  { name: 'Corn',     emoji: '🌽', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=300&q=70', color: '#FBBF24' },
  { name: 'Soybean',  emoji: '🫘', image: 'https://images.unsplash.com/photo-1599863484218-c0b7937d2f9d?w=300&q=70', color: '#84CC16' },
  { name: 'Sugarcane',emoji: '🎋', image: 'https://images.unsplash.com/photo-1615598681283-7d72cbff3462?w=300&q=70', color: '#14B8A6' },
  { name: 'Onion',    emoji: '🧅', image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=300&q=70', color: '#A855F7' },
];

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onComplete, onLogout, t, navigateTo }) => {
  const [name, setName]               = useState('');
  const [district, setDistrict]       = useState('');
  const [crops, setCrops]             = useState<string[]>([]);
  const [landSize, setLandSize]       = useState<number>(0);
  const [category, setCategory]       = useState<'General'|'OBC'|'SC'|'ST'>('General');
  const [farmingType, setFarmingType] = useState<'Organic'|'Conventional'|'Mixed'>('Mixed');
  const [loading, setLoading]         = useState(false);
  const [focusedField, setFocusedField] = useState<string|null>(null);

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await userService.getProfile();
        if (profile.name)         setName(profile.name);
        if (profile.district)     setDistrict(profile.district);
        if (profile.land_size)    setLandSize(profile.land_size);
        if (profile.category)     setCategory(profile.category as any);
        if (profile.farming_type) setFarmingType(profile.farming_type as any);
        if (profile.crops) {
          if (typeof profile.crops === 'string') setCrops((profile.crops as string).split(',').filter(Boolean));
          else if (Array.isArray(profile.crops)) setCrops(profile.crops);
        }
      } catch (e) { console.error('Error loading profile', e); }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const profileData = { name, district, land_size: landSize, category, farming_type: farmingType, crops };
      await userService.updateProfile(profileData);
      onComplete({ ...profileData, crops } as UserProfile);
    } catch (e) {
      console.error('Failed to save profile', e);
      alert('Failed to save profile. Please try again.');
    } finally { setLoading(false); }
  };

  const progress = (() => {
    let done = 0;
    if (name) done++;
    if (district) done++;
    if (crops.length > 0) done++;
    if (farmingType) done++;
    return Math.round((done / 4) * 100);
  })();

  // Avatar initials
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '🌱';

  return (
    <div className="h-full flex flex-col relative overflow-hidden" style={{ background: '#F5FBF7' }}>

      {/* ══════════ HERO HEADER ══════════ */}
      <div className="relative shrink-0 overflow-hidden" style={{ background: 'linear-gradient(160deg, #011C0E 0%, #022D18 45%, #044726 100%)', paddingBottom: 64 }}>
        {/* Aurora blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ scale: [1,1.2,1], opacity: [0.2,0.35,0.2] }} transition={{ duration: 10, repeat: Infinity }}
            className="absolute -top-16 -left-16 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, #00FF87, transparent 70%)' }} />
          <motion.div animate={{ scale: [1.1,1,1.1], opacity: [0.1,0.2,0.1] }} transition={{ duration: 14, repeat: Infinity, delay: 4 }}
            className="absolute -bottom-8 -right-8 w-56 h-56 rounded-full"
            style={{ background: 'radial-gradient(circle, #FFB800, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.2) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
        </div>

        <div className="relative z-10 px-5 pt-12">
          {/* Top row */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigateTo('home')}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-white/20"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <ArrowLeft size={18} className="text-white" />
            </button>
            <h1 className="text-base font-black text-white tracking-tight">My Profile</h1>
            <div className="w-9 h-9" />
          </div>

          {/* Avatar + name */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              {/* Rotating ring */}
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full"
                style={{ padding: 3, background: 'conic-gradient(from 0deg, #00FF87, #FFB800, #00D4FF, #00FF87)' }}>
                <div className="w-full h-full rounded-full" style={{ background: '#022D18' }} />
              </motion.div>
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white"
                style={{ background: 'linear-gradient(135deg, #00BB78, #059669)', margin: 3, boxShadow: '0 0 20px rgba(0,255,135,0.4)' }}>
                {initials}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-lg font-black text-white leading-tight">{name || 'Your Name'}</p>
              <p className="text-xs text-white/50 font-medium mt-0.5 flex items-center gap-1">
                <MapPin size={10} className="text-emerald-400" />
                {district || 'District not set'} · {farmingType}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.2)' }}>
                  <Star size={10} className="text-emerald-400 fill-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400">Verified Farmer</span>
                </div>
                {crops.length > 0 && (
                  <div className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <span className="text-[10px] font-bold text-white/60">{crops.length} crops</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Profile Complete</span>
              <span className="text-[10px] font-black text-emerald-400">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #00FF87, #00BB78)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ FORM CARD ══════════ */}
      <div className="flex-1 overflow-y-auto -mt-8 relative z-10 rounded-t-3xl bg-white"
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.06)' }}>
        <div className="px-5 pt-6 pb-32 space-y-5">

          {/* ── Name ── */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#9CA3AF' }}>
              Full Name
            </label>
            <div className="flex items-center rounded-2xl overflow-hidden border transition-all"
              style={{
                background: focusedField === 'name' ? '#F0FDF4' : '#FAFAFA',
                borderColor: focusedField === 'name' ? '#00BB78' : '#E5E7EB',
                boxShadow: focusedField === 'name' ? '0 0 0 3px rgba(0,187,120,0.1)' : 'none',
              }}>
              <div className="pl-4 pr-2">
                <User size={17} style={{ color: focusedField === 'name' ? '#00BB78' : '#9CA3AF' }} />
              </div>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                placeholder="Enter your full name"
                className="flex-1 py-3.5 pr-4 bg-transparent outline-none text-sm font-bold"
                style={{ color: '#001A11' }} />
              {name && <div className="pr-4"><CheckCircle2 size={16} className="text-emerald-500" /></div>}
            </div>
          </div>

          {/* ── District ── */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#9CA3AF' }}>
              District
            </label>
            <div className="flex items-center rounded-2xl overflow-hidden border transition-all"
              style={{
                background: focusedField === 'district' ? '#F0FDF4' : '#FAFAFA',
                borderColor: focusedField === 'district' ? '#00BB78' : '#E5E7EB',
                boxShadow: focusedField === 'district' ? '0 0 0 3px rgba(0,187,120,0.1)' : 'none',
              }}>
              <div className="pl-4 pr-2">
                <MapPin size={17} style={{ color: focusedField === 'district' ? '#00BB78' : '#9CA3AF' }} />
              </div>
              <input type="text" value={district} onChange={e => setDistrict(e.target.value)}
                onFocus={() => setFocusedField('district')} onBlur={() => setFocusedField(null)}
                placeholder="e.g. Nagpur"
                className="flex-1 py-3.5 pr-4 bg-transparent outline-none text-sm font-bold"
                style={{ color: '#001A11' }} />
              {district && <div className="pr-4"><CheckCircle2 size={16} className="text-emerald-500" /></div>}
            </div>
          </div>

          {/* ── Farming Type ── */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#9CA3AF' }}>
              Farming Type
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { value: 'Organic',      icon: '🌿', label: 'Organic',    color: '#10B981', bg: '#ECFDF5' },
                { value: 'Conventional', icon: '🚜', label: 'Standard',   color: '#3B82F6', bg: '#EFF6FF' },
                { value: 'Mixed',        icon: '✨', label: 'Mixed',      color: '#8B5CF6', bg: '#F5F3FF' },
              ].map(type => {
                const active = farmingType === type.value;
                return (
                  <motion.button key={type.value} whileTap={{ scale: 0.95 }}
                    onClick={() => setFarmingType(type.value as any)}
                    className="py-3 rounded-2xl flex flex-col items-center gap-1.5 border font-bold text-xs transition-all"
                    style={{
                      background: active ? type.bg : '#FAFAFA',
                      borderColor: active ? type.color : '#E5E7EB',
                      color: active ? type.color : '#9CA3AF',
                      boxShadow: active ? `0 4px 12px ${type.color}25` : 'none',
                    }}>
                    <span className="text-xl">{type.icon}</span>
                    <span>{type.label}</span>
                    {active && <div className="w-1.5 h-1.5 rounded-full" style={{ background: type.color }} />}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Category ── */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#9CA3AF' }}>
              Category
            </label>
            <div className="flex gap-2">
              {(['General','OBC','SC','ST'] as const).map(cat => (
                <motion.button key={cat} whileTap={{ scale: 0.92 }}
                  onClick={() => setCategory(cat)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black border transition-all"
                  style={{
                    background: category === cat ? '#001A11' : '#FAFAFA',
                    color: category === cat ? '#00FF87' : '#9CA3AF',
                    borderColor: category === cat ? '#001A11' : '#E5E7EB',
                  }}>
                  {cat}
                </motion.button>
              ))}
            </div>
          </div>

          {/* ── Crops ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[10px] font-black uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
                Your Crops
              </label>
              {crops.length > 0 && (
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-emerald-700"
                  style={{ background: '#DCFCE7', border: '1px solid #86EFAC' }}>
                  {crops.length} selected
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {crops_data.map(crop => {
                const selected = crops.includes(crop.name);
                return (
                  <motion.button key={crop.name} whileTap={{ scale: 0.93 }}
                    onClick={() => {
                      if (selected) setCrops(crops.filter(c => c !== crop.name));
                      else setCrops([...crops, crop.name]);
                    }}
                    className="relative flex flex-col items-center gap-1.5 pt-3 pb-2.5 rounded-2xl border transition-all overflow-hidden"
                    style={{
                      background: selected ? '#F0FDF4' : '#FAFAFA',
                      borderColor: selected ? crop.color : '#E5E7EB',
                      boxShadow: selected ? `0 4px 14px ${crop.color}30` : 'none',
                    }}>
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden"
                      style={{ boxShadow: selected ? `0 2px 8px ${crop.color}50` : 'none' }}>
                      <img src={crop.image} alt={crop.name} className="w-full h-full object-cover" />
                      {selected && (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: `${crop.color}44` }}>
                          <CheckCircle2 size={20} className="text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-black text-center leading-tight"
                      style={{ color: selected ? '#001A11' : '#9CA3AF' }}>
                      {crop.name}
                    </span>
                    {selected && (
                      <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                        style={{ background: crop.color, boxShadow: `0 0 6px ${crop.color}` }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Stats cards ── */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: '🏆', label: 'Rank', value: '#1,247', color: '#F59E0B', bg: '#FFFBEB' },
              { icon: '🌿', label: 'Carbon', value: '0.0 ACT', color: '#10B981', bg: '#ECFDF5' },
              { icon: '📍', label: 'Fields', value: '0 plots', color: '#6366F1', bg: '#EEF2FF' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1 py-3 rounded-2xl border"
                style={{ background: stat.bg, borderColor: `${stat.color}30` }}>
                <span className="text-xl">{stat.icon}</span>
                <p className="text-sm font-black" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ BOTTOM ACTIONS ══════════ */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 z-20"
        style={{ background: 'linear-gradient(0deg, white 70%, transparent)' }}>

        <motion.button whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={!name || !district || loading}
          className="relative w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 overflow-hidden font-black text-sm transition-all"
          style={{
            background: name && district ? 'linear-gradient(135deg, #00BB78, #059669)' : '#E5E7EB',
            color: name && district ? 'white' : '#9CA3AF',
            boxShadow: name && district ? '0 8px 24px rgba(0,187,120,0.35)' : 'none',
          }}>
          {/* Shimmer */}
          {name && district && (
            <motion.div animate={{ x: ['-100%','200%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
              className="absolute inset-0 skew-x-12 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
          )}
          {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
          <span>{loading ? 'Saving...' : (t.complete_profile || 'Save Profile')}</span>
        </motion.button>

        {onLogout && (
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => { if (window.confirm('Are you sure you want to log out?')) onLogout!(); }}
            className="mt-2 w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm"
            style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}>
            <LogOut size={16} />
            Log Out
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default ProfileScreen;