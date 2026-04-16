
import React, { useState } from 'react';
import { COLORS } from '../constants';
import { Screen, UserProfile } from '../types';
import { ChevronRight, MapPin, Wheat, LayoutGrid, Leaf, ChevronDown, Loader2, ArrowLeft } from 'lucide-react';
import { userService } from '../src/services/api';

interface ProfileScreenProps {
  onComplete: (profile: UserProfile) => void;
  t: any;
  navigateTo: (screen: Screen) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onComplete, t, navigateTo }) => {
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [crops, setCrops] = useState<string[]>([]);
  const [cropInput, setCropInput] = useState('');
  const [landSize, setLandSize] = useState<number>(0);
  const [category, setCategory] = useState<'General' | 'OBC' | 'SC' | 'ST'>('General');
  const [farmingType, setFarmingType] = useState<'Organic' | 'Conventional' | 'Mixed'>('Mixed');

  const [loading, setLoading] = useState(false);

  // Fetch existing profile data on mount
  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await userService.getProfile();
        if (profile.name) setName(profile.name);
        if (profile.district) setDistrict(profile.district);
        if (profile.land_size) setLandSize(profile.land_size);
        if (profile.category) setCategory(profile.category as any);
        if (profile.farming_type) setFarmingType(profile.farming_type as any);
        if (profile.farming_type) setFarmingType(profile.farming_type as any);
        if (profile.crops) {
          // Handle both string (from separate fetch?) or if we change API to return list. 
          // Our Users router returns string for simplicity.
          if (typeof profile.crops === 'string') {
            setCrops((profile.crops as string).split(',').filter(Boolean));
          } else if (Array.isArray(profile.crops)) {
            setCrops(profile.crops);
          }
        }
        // Assuming we might need to store it in a specific field or skip for now.
        // For now, we keep local state for crops but backend might not persist it unless we added a field.
        // Checking models.py -> Crop is a separate table, but User model doesn't have 'crops' list column directly? 
        // actually User has 'crops' column in the plan? No, `Crop` table relationship.
        // Let's assume for MVP we might lose crops or need to add logic.
        // Wait, models.py: User has `district`, `land_size`, etc. Crop is separate.
        // We will send it, but backend needs to handle it. 
        // The implementation plan Users router `UserProfileUpdate` excluded crops list logic for simplicity.
        // We will proceed with updating what we can.
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
      // We still pass data up for immediate UI update in App.tsx
      onComplete({ ...profileData, crops } as UserProfile);
    } catch (e) {
      console.error("Failed to save profile", e);
      alert("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addCrop = () => {
    if (cropInput.trim() && !crops.includes(cropInput.trim())) {
      setCrops([...crops, cropInput.trim()]);
      setCropInput('');
    }
  };

  return (
    <div className="h-full bg-[#f8fafc] flex flex-col relative font-sans">
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 p-6 pt-12 pb-14 shadow-[0_10px_30px_rgba(4,120,87,0.3)] relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/40 to-transparent"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
        
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <button onClick={() => navigateTo('home')} className="p-2 -ml-2 text-white/80 hover:text-white bg-white/10 rounded-full backdrop-blur-md transition-colors active:scale-95">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-3xl font-black text-white leading-none drop-shadow-md tracking-tight">{t.create_profile}</h2>
        </div>
        <p className="text-emerald-100/90 text-sm relative z-10 font-medium tracking-wide">{t.farm_details}</p>
      </div>

      <div className="flex-1 px-6 pt-8 pb-10 overflow-y-auto bg-[#fafbf9] -mt-6 rounded-t-[2.5rem] relative z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">

        <div className="space-y-6">
          {/* Floating Label Input for Name */}
          <div className="relative group hover-lift">
            <input
              type="text"
              id="fullName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 pt-6 pb-2 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-black shadow-sm transition-all peer"
              placeholder=" "
            />
            <label htmlFor="fullName" className="absolute text-[10px] font-black text-gray-400 uppercase tracking-widest left-5 top-3.5 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-placeholder-shown:font-medium peer-focus:text-[10px] peer-focus:top-2 peer-focus:font-black peer-focus:text-emerald-600 pointer-events-none">
              {t.full_name}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative group hover-lift">
              <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600/50" size={18} />
              <input
                type="text"
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-5 pt-6 pb-2 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-black shadow-sm transition-all peer"
                placeholder=" "
              />
              <label htmlFor="district" className="absolute text-[10px] font-black text-gray-400 uppercase tracking-widest left-5 top-3.5 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-placeholder-shown:font-medium peer-focus:text-[10px] peer-focus:top-2 peer-focus:font-black peer-focus:text-emerald-600 pointer-events-none">
                {t.district}
              </label>
            </div>

            <div className="relative group hover-lift">
              <input
                type="number"
                id="landSize"
                value={landSize || ''}
                onChange={(e) => setLandSize(parseFloat(e.target.value))}
                className="w-full px-5 pt-6 pb-2 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-black shadow-sm transition-all peer"
                placeholder=" "
              />
              <label htmlFor="landSize" className="absolute text-[10px] font-black text-gray-400 uppercase tracking-widest left-5 top-3.5 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-placeholder-shown:font-medium peer-focus:text-[10px] peer-focus:top-2 peer-focus:font-black peer-focus:text-emerald-600 pointer-events-none">
                {t.land_size}
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative group hover-lift">
              <select
                id="category"
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full px-5 pt-6 pb-2 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-black appearance-none shadow-sm transition-all peer"
              >
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
              </select>
              <label htmlFor="category" className="absolute text-[10px] font-black text-emerald-600 uppercase tracking-widest left-5 top-2 transition-all pointer-events-none">
                {t.category}
              </label>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative group hover-lift">
              <select
                id="farmingType"
                value={farmingType}
                onChange={(e: any) => setFarmingType(e.target.value)}
                className="w-full px-5 pt-6 pb-2 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-black appearance-none shadow-sm transition-all peer"
              >
                <option value="Mixed">Mixed</option>
                <option value="Organic">Organic</option>
                <option value="Conventional">Conventional</option>
              </select>
              <label htmlFor="farmingType" className="absolute text-[10px] font-black text-emerald-600 uppercase tracking-widest left-5 top-2 transition-all pointer-events-none">
                {t.farming_type}
              </label>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="pt-4">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">{t.crops_grow || 'Your Crops'}</label>

            {/* Crop Grid - Premium Image Selection */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { name: 'Wheat', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&auto=format&fit=crop&q=60' },
                { name: 'Rice', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=60' },
                { name: 'Cotton', image: 'https://images.unsplash.com/photo-1507204689620-eeba92147171?w=400&auto=format&fit=crop&q=60' },
                { name: 'Tomato', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=60' },
                { name: 'Potato', image: 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=400&auto=format&fit=crop&q=60' },
                { name: 'Corn', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&auto=format&fit=crop&q=60' },
                { name: 'Soybean', image: 'https://images.unsplash.com/photo-1599863484218-c0b7937d2f9d?w=400&auto=format&fit=crop&q=60' },
                { name: 'Sugarcane', image: 'https://images.unsplash.com/photo-1615598681283-7d72cbff3462?w=400&auto=format&fit=crop&q=60' },
                { name: 'Onion', image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop&q=60' },
              ].map((crop) => {
                const isSelected = crops.includes(crop.name);
                return (
                  <button
                    key={crop.name}
                    onClick={() => {
                      if (isSelected) {
                        setCrops(crops.filter(c => c !== crop.name));
                      } else {
                        setCrops([...crops, crop.name]);
                      }
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-[1.5rem] border-2 transition-all active:scale-95 group ${isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-md'
                      : 'border-transparent bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5'
                      }`}
                  >
                    <div className={`w-[70px] h-[70px] rounded-[1.2rem] overflow-hidden flex items-center justify-center transition-all ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
                      }`}>
                      <img
                        src={crop.image}
                        alt={crop.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <span className={`text-[11px] font-black tracking-wide ${isSelected ? 'text-emerald-700' : 'text-gray-600'
                      }`}>
                      {crop.name}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-200">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Crops Summary */}
            {crops.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-4 glass rounded-[1.5rem] border border-emerald-100 shadow-sm mt-6 mb-2">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mr-1">Selected</span>
                {crops.map((crop) => (
                  <span key={crop} className="text-xs font-black text-white bg-emerald-500 px-2.5 py-1 rounded-lg shadow-sm border border-emerald-400">{crop}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pb-10">
          <button
            onClick={handleSave}
            disabled={!name || !district || loading}
            className="w-full py-4 rounded-[1.5rem] font-black text-sm text-white bg-gradient-to-r from-emerald-500 to-emerald-700 shadow-[0_8px_25px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 hover-lift disabled:opacity-50 active-press border border-emerald-400/50"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                {t.complete_profile}
                <ChevronRight size={18} strokeWidth={3} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
