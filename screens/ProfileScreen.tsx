import React, { useState } from 'react';
import { Screen, UserProfile } from '../types';
import {
  ChevronRight,
  MapPin,
  ArrowLeft,
  ChevronDown,
  Loader2,
  User,
  Ruler,
  Sprout,
  Tractor,
  CheckCircle2,
  Sparkles,
  Leaf,
  Users,
  Award,
  X,
  Wheat,
  LogOut
} from 'lucide-react';
import { userService } from '../src/services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileScreenProps {
  onComplete: (profile: UserProfile) => void;
  onLogout?: () => void;
  t: any;
  navigateTo: (screen: Screen) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onComplete, onLogout, t, navigateTo }) => {
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [crops, setCrops] = useState<string[]>([]);
  const [landSize, setLandSize] = useState<number>(0);
  const [category, setCategory] = useState<'General' | 'OBC' | 'SC' | 'ST'>('General');
  const [farmingType, setFarmingType] = useState<'Organic' | 'Conventional' | 'Mixed'>('Mixed');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await userService.getProfile();
        if (profile.name) setName(profile.name);
        if (profile.district) setDistrict(profile.district);
        if (profile.land_size) setLandSize(profile.land_size);
        if (profile.category) setCategory(profile.category as any);
        if (profile.farming_type) setFarmingType(profile.farming_type as any);
        if (profile.crops) {
          if (typeof profile.crops === 'string') {
            setCrops((profile.crops as string).split(',').filter(Boolean));
          } else if (Array.isArray(profile.crops)) {
            setCrops(profile.crops);
          }
        }
      } catch (e) {
        console.error("Error loading profile", e);
      }
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
      console.error("Failed to save profile", e);
      alert("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate completion progress
  const completionProgress = () => {
    let completed = 0;
    const total = 4;
    if (name) completed++;
    if (district) completed++;
    if (crops.length > 0) completed++;
    if (farmingType) completed++;
    return Math.round((completed / total) * 100);
  };

  const progress = completionProgress();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const cropGridVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.2 }
    }
  };

  const crops_data = [
    { name: 'Wheat', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&auto=format&fit=crop&q=60' },
    { name: 'Rice', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=60' },
    { name: 'Cotton', image: 'https://images.unsplash.com/photo-1507204689620-eeba92147171?w=400&auto=format&fit=crop&q=60' },
    { name: 'Tomato', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=60' },
    { name: 'Potato', image: 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=400&auto=format&fit=crop&q=60' },
    { name: 'Corn', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&auto=format&fit=crop&q=60' },
    { name: 'Soybean', image: 'https://images.unsplash.com/photo-1599863484218-c0b7937d2f9d?w=400&auto=format&fit=crop&q=60' },
    { name: 'Sugarcane', image: 'https://images.unsplash.com/photo-1615598681283-7d72cbff3462?w=400&auto=format&fit=crop&q=60' },
    { name: 'Onion', image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop&q=60' },
  ];

  return (
    <div className="h-full bg-white flex flex-col relative font-sans overflow-hidden">

      {/* ========== PREMIUM HEADER ========== */}
      <div className="relative p-6 pt-12 pb-16 shrink-0" style={{ background: '#001A11' }}>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigateTo('home')}
              className="p-2 text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-white leading-tight">
                {t.create_profile || 'Create Profile'}
              </h2>
              <p className="text-sm font-medium mt-1" style={{ color: '#00BB78' }}>
                {t.farm_details || 'Personalize your farming experience'}
              </p>
            </div>
          </div>

          {/* ==== PROGRESS BAR ==== */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Profile Progress
              </span>
              <span className="text-xs font-bold text-white">
                {progress}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden relative" style={{ background: '#1A332A' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: '#00BB78' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========== FORM CONTENT ========== */}
      <div className="flex-1 px-5 pt-7 pb-10 overflow-y-auto bg-white -mt-6 rounded-t-3xl relative z-20 shadow-sm">
        <div className="space-y-6">

          {/* ==== NAME FIELD ==== */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#616B68' }}>
              {t.full_name || 'Full Name'}
            </label>
            <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:border-green-500 transition-colors shadow-sm">
              <div className="pl-4 pr-2">
                <User size={18} className={focusedField === 'name' ? 'text-green-600' : 'text-gray-400'} />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your full name"
                className="w-full py-3.5 pr-4 bg-transparent outline-none font-bold"
                style={{ color: '#001A11' }}
              />
              {name && (
                <div className="pr-4">
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
              )}
            </div>
          </div>

          {/* ==== DISTRICT ==== */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#616B68' }}>
              {t.district || 'District'}
            </label>
            <div className="flex items-center bg-white border border-gray-200 rounded-xl focus-within:border-green-500 transition-colors shadow-sm">
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                onFocus={() => setFocusedField('district')}
                onBlur={() => setFocusedField(null)}
                placeholder="Nagpur"
                className="w-full px-4 py-3.5 bg-transparent outline-none font-bold"
                style={{ color: '#001A11' }}
              />
            </div>
          </div>

          {/* ==== FARMING TYPE CARDS ==== */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#616B68' }}>
              {t.farming_type || 'Farming Type'}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'Organic', icon: Leaf, label: 'Organic' },
                { value: 'Conventional', icon: Tractor, label: 'Standard' },
                { value: 'Mixed', icon: Sparkles, label: 'Mixed' },
              ].map((type) => {
                const Icon = type.icon;
                const isActive = farmingType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setFarmingType(type.value as any)}
                    className="p-4 rounded-2xl font-bold text-xs transition-all flex flex-col items-center gap-2 border"
                    style={{
                      background: isActive ? '#E8FBF3' : '#FFFFFF',
                      color: isActive ? '#001A11' : '#616B68',
                      borderColor: isActive ? '#00BB78' : '#E5E7EB'
                    }}
                  >
                    <Icon size={24} style={{ color: isActive ? '#00BB78' : '#9CA3AF' }} />
                    <span>{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ==== CROPS SECTION ==== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#616B68' }}>
                {t.crops_grow || 'Your Crops'}
              </label>
              {crops.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  {crops.length} selected
                </span>
              )}
            </div>

            {/* Crop Grid */}
            <div className="grid grid-cols-3 gap-3">
              {crops_data.map((crop) => {
                const isSelected = crops.includes(crop.name);
                return (
                  <button
                    key={crop.name}
                    onClick={() => {
                      if (isSelected) setCrops(crops.filter(c => c !== crop.name));
                      else setCrops([...crops, crop.name]);
                    }}
                    className="relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border"
                    style={{
                      background: isSelected ? '#E8FBF3' : '#FFFFFF',
                      borderColor: isSelected ? '#00BB78' : '#E5E7EB'
                    }}
                  >
                    <div className="relative w-14 h-14 rounded-full overflow-hidden shadow-sm">
                      <img src={crop.image} alt={crop.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: isSelected ? '#001A11' : '#616B68' }}>
                      {crop.name}
                    </span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-white rounded-full">
                        <CheckCircle2 size={16} style={{ color: '#00BB78' }} className="bg-white rounded-full" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==== SUBMIT BUTTON ==== */}
        <div className="mt-8 pb-6">
          <button
            onClick={handleSave}
            disabled={!name || !district || loading}
            className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            style={{ background: '#001A11' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {t.complete_profile || 'Complete Profile'}
          </button>

          {/* ==== LOGOUT BUTTON ==== */}
          {onLogout && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to log out?')) onLogout();
              }}
              className="mt-4 w-full py-4 rounded-2xl font-bold text-sm bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Log Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;