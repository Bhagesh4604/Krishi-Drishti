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
    const total = 5;
    if (name) completed++;
    if (district) completed++;
    if (landSize > 0) completed++;
    if (crops.length > 0) completed++;
    if (category && farmingType) completed++;
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
    { name: 'Wheat', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&auto=format&fit=crop&q=60', emoji: '🌾', color: 'from-amber-400 to-yellow-500' },
    { name: 'Rice', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=60', emoji: '🍚', color: 'from-green-400 to-emerald-500' },
    { name: 'Cotton', image: 'https://images.unsplash.com/photo-1507204689620-eeba92147171?w=400&auto=format&fit=crop&q=60', emoji: '☁️', color: 'from-gray-300 to-gray-400' },
    { name: 'Tomato', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=60', emoji: '🍅', color: 'from-red-400 to-rose-500' },
    { name: 'Potato', image: 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=400&auto=format&fit=crop&q=60', emoji: '🥔', color: 'from-yellow-600 to-amber-700' },
    { name: 'Corn', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&auto=format&fit=crop&q=60', emoji: '🌽', color: 'from-yellow-400 to-orange-500' },
    { name: 'Soybean', image: 'https://images.unsplash.com/photo-1599863484218-c0b7937d2f9d?w=400&auto=format&fit=crop&q=60', emoji: '🫘', color: 'from-lime-400 to-green-500' },
    { name: 'Sugarcane', image: 'https://images.unsplash.com/photo-1615598681283-7d72cbff3462?w=400&auto=format&fit=crop&q=60', emoji: '🎋', color: 'from-teal-400 to-cyan-500' },
    { name: 'Onion', image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop&q=60', emoji: '🧅', color: 'from-purple-400 to-pink-500' },
  ];

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 via-emerald-50/30 to-gray-50 flex flex-col relative font-sans overflow-hidden">

      {/* ========== PREMIUM ANIMATED HEADER ========== */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="relative bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 p-6 pt-12 pb-20 shadow-2xl shadow-emerald-900/30 overflow-hidden shrink-0"
      >
        {/* Animated background patterns */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                              radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
            backgroundSize: '30px 30px, 40px 40px'
          }}
        />

        {/* Animated blobs */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-10 -left-10 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl"
        />

        {/* Floating leaves */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-emerald-300/30"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -15, 0],
              rotate: [0, 15, -15, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          >
            <Leaf size={16 + (i % 3) * 4} />
          </motion.div>
        ))}

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <motion.button
              whileHover={{ scale: 1.1, rotate: -10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigateTo('home')}
              className="p-2.5 text-white/90 hover:text-white bg-white/15 rounded-2xl backdrop-blur-md border border-white/20 transition-colors"
            >
              <ArrowLeft size={20} />
            </motion.button>

            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full mb-1.5"
              >
                <Sparkles size={10} className="text-amber-300" />
                <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">
                  Welcome Farmer
                </span>
              </motion.div>
              <h2 className="text-2xl font-black text-white leading-tight drop-shadow-lg">
                {t.create_profile || 'Create Profile'}
              </h2>
            </div>
          </div>

          <p className="text-emerald-100/90 text-xs font-semibold tracking-wide mb-4">
            {t.farm_details || 'Tell us about your farm to personalize your experience'}
          </p>

          {/* ==== PROGRESS BAR ==== */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Award size={12} className="text-amber-300" />
                <span className="text-[10px] font-black text-white uppercase tracking-wider">
                  Profile Progress
                </span>
              </div>
              <motion.span
                key={progress}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="text-sm font-black text-white"
              >
                {progress}%
              </motion.span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-amber-300 via-yellow-300 to-emerald-300 rounded-full relative"
              >
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ========== FORM CONTENT ========== */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 px-5 pt-7 pb-10 overflow-y-auto bg-white -mt-8 rounded-t-[2.5rem] relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]"
      >
        <div className="space-y-5">

          {/* ==== NAME FIELD ==== */}
          <motion.div variants={itemVariants}>
            <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 uppercase tracking-[0.15em] mb-2 ml-1">
              <User size={12} className="text-emerald-600" />
              {t.full_name || 'Full Name'}
            </label>
            <div className={`relative transition-all ${focusedField === 'name' ? 'scale-[1.01]' : ''}`}>
              <div className={`absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl opacity-0 transition-opacity ${focusedField === 'name' ? 'opacity-20' : ''}`} style={{ filter: 'blur(8px)' }} />
              <div className="relative flex items-center bg-gray-50 border-2 border-gray-100 rounded-2xl overflow-hidden focus-within:border-emerald-500 focus-within:bg-white transition-all">
                <div className="pl-4 pr-2">
                  <User size={18} className={`transition-colors ${focusedField === 'name' ? 'text-emerald-600' : 'text-gray-400'}`} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your full name"
                  className="w-full py-4 pr-4 bg-transparent outline-none text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-medium"
                />
                {name && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="pr-4"
                  >
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ==== DISTRICT + LAND SIZE ==== */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div variants={itemVariants}>
              <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 uppercase tracking-[0.15em] mb-2 ml-1">
                <MapPin size={12} className="text-emerald-600" />
                {t.district || 'District'}
              </label>
              <div className="relative flex items-center bg-gray-50 border-2 border-gray-100 rounded-2xl focus-within:border-emerald-500 focus-within:bg-white transition-all">
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  onFocus={() => setFocusedField('district')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Nagpur"
                  className="w-full px-4 py-4 bg-transparent outline-none text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-medium"
                />
                {district && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="pr-3"
                  >
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </motion.div>
                )}
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 uppercase tracking-[0.15em] mb-2 ml-1">
                <Ruler size={12} className="text-emerald-600" />
                {t.land_size || 'Land (Ha)'}
              </label>
              <div className="relative flex items-center bg-gray-50 border-2 border-gray-100 rounded-2xl focus-within:border-emerald-500 focus-within:bg-white transition-all">
                <input
                  type="number"
                  value={landSize || ''}
                  onChange={(e) => setLandSize(parseFloat(e.target.value))}
                  onFocus={() => setFocusedField('land')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="2.5"
                  className="w-full px-4 py-4 bg-transparent outline-none text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-medium"
                />
                {landSize > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="pr-3"
                  >
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ==== CATEGORY CHIPS ==== */}
          <motion.div variants={itemVariants}>
            <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 uppercase tracking-[0.15em] mb-2 ml-1">
              <Users size={12} className="text-emerald-600" />
              {t.category || 'Category'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['General', 'OBC', 'SC', 'ST'] as const).map((cat) => (
                <motion.button
                  key={cat}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => setCategory(cat)}
                  className={`relative py-3 rounded-2xl font-black text-xs transition-all overflow-hidden ${category === cat
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-300'
                      : 'bg-gray-50 text-gray-600 border-2 border-gray-100'
                    }`}
                >
                  {category === cat && (
                    <motion.div
                      layoutId="category-indicator"
                      className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600"
                      transition={{ type: 'spring', damping: 20 }}
                    />
                  )}
                  <span className="relative z-10">{cat}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* ==== FARMING TYPE CARDS ==== */}
          <motion.div variants={itemVariants}>
            <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 uppercase tracking-[0.15em] mb-2 ml-1">
              <Tractor size={12} className="text-emerald-600" />
              {t.farming_type || 'Farming Type'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'Organic', emoji: '🌱', label: 'Organic', color: 'from-green-400 to-emerald-500' },
                { value: 'Conventional', emoji: '🚜', label: 'Standard', color: 'from-blue-400 to-indigo-500' },
                { value: 'Mixed', emoji: '🌿', label: 'Mixed', color: 'from-purple-400 to-pink-500' },
              ].map((type) => (
                <motion.button
                  key={type.value}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  onClick={() => setFarmingType(type.value as any)}
                  className={`relative p-3 rounded-2xl font-black text-xs transition-all flex flex-col items-center gap-1 overflow-hidden ${farmingType === type.value
                      ? 'text-white shadow-lg border-2 border-white/30'
                      : 'bg-gray-50 text-gray-600 border-2 border-gray-100'
                    }`}
                  style={farmingType === type.value ? {
                    background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                  } : {}}
                >
                  {farmingType === type.value && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${type.color}`} />
                  )}
                  <span className="relative z-10 text-2xl">{type.emoji}</span>
                  <span className="relative z-10">{type.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* ==== CROPS SECTION ==== */}
          <motion.div variants={itemVariants} className="pt-2">
            <div className="flex items-center justify-between mb-3 ml-1">
              <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 uppercase tracking-[0.15em]">
                <Sprout size={12} className="text-emerald-600" />
                {t.crops_grow || 'Your Crops'}
              </label>
              {crops.length > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200"
                >
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-700">
                    {crops.length} selected
                  </span>
                </motion.div>
              )}
            </div>

            {/* Crop Grid */}
            <motion.div
              variants={cropGridVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-3 gap-3"
            >
              {crops_data.map((crop) => {
                const isSelected = crops.includes(crop.name);
                return (
                  <motion.button
                    key={crop.name}
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (isSelected) {
                        setCrops(crops.filter(c => c !== crop.name));
                      } else {
                        setCrops([...crops, crop.name]);
                      }
                    }}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-3xl transition-all overflow-hidden ${isSelected
                        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-500 shadow-lg shadow-emerald-200'
                        : 'bg-white border-2 border-gray-100 shadow-sm hover:border-emerald-200'
                      }`}
                  >
                    {/* Selected glow effect */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`absolute inset-0 bg-gradient-to-br ${crop.color} opacity-[0.08]`}
                      />
                    )}

                    <div className={`relative w-16 h-16 rounded-2xl overflow-hidden transition-all ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
                      }`}>
                      <img
                        src={crop.image}
                        alt={crop.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                      {/* Emoji fallback overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${crop.color} opacity-0 flex items-center justify-center text-3xl transition-opacity ${!crop.image ? 'opacity-100' : ''}`}>
                        {crop.emoji}
                      </div>
                    </div>

                    <span className={`relative z-10 text-[11px] font-black tracking-wide ${isSelected ? 'text-emerald-700' : 'text-gray-700'
                      }`}>
                      {crop.name}
                    </span>

                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0, rotate: -180 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0 }}
                          transition={{ type: 'spring', damping: 15 }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-300 border-2 border-white"
                        >
                          <CheckCircle2 size={12} className="text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Selected Crops Summary */}
            <AnimatePresence>
              {crops.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: 20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  className="mt-4"
                >
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-100 rounded-2xl p-3 relative overflow-hidden">
                    <motion.div
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={12} className="text-amber-500" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.15em]">
                          Your Crop Portfolio
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {crops.map((crop) => (
                          <motion.span
                            key={crop}
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0 }}
                            whileHover={{ scale: 1.05 }}
                            className="group flex items-center gap-1 text-[11px] font-black text-white bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 py-1 rounded-lg shadow-md shadow-emerald-200"
                          >
                            <Sprout size={10} />
                            {crop}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCrops(crops.filter(c => c !== crop));
                              }}
                              className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                            >
                              <X size={10} strokeWidth={3} />
                            </button>
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ==== SUBMIT BUTTON ==== */}
        <motion.div variants={itemVariants} className="mt-8 pb-6">
          <motion.button
            whileHover={{ scale: !name || !district || loading ? 1 : 1.02 }}
            whileTap={{ scale: !name || !district || loading ? 1 : 0.98 }}
            onClick={handleSave}
            disabled={!name || !district || loading}
            className="relative w-full py-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 shadow-xl shadow-emerald-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            {/* Shimmer effect */}
            {!loading && name && district && (
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
              />
            )}

            <span className="relative z-10 flex items-center gap-2">
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving Your Profile...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} strokeWidth={2.5} />
                  {t.complete_profile || 'Complete Profile'}
                  <ChevronRight size={18} strokeWidth={3} />
                </>
              )}
            </span>
          </motion.button>

          {/* Helper text */}
          {(!name || !district) && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[10px] font-bold text-gray-400 mt-3 flex items-center justify-center gap-1.5"
            >
              <span className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
              Please fill in your name and district to continue
            </motion.p>
          )}

          {/* ==== LOGOUT BUTTON ==== */}
          {onLogout && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (window.confirm('Are you sure you want to log out?')) {
                  onLogout();
                }
              }}
              className="mt-4 w-full py-4 rounded-2xl font-black text-sm text-red-600 bg-red-50 border-2 border-red-100 hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut size={18} />
              Log Out
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ProfileScreen;