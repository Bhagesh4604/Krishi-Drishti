
import React, { useState } from 'react';
import { COLORS } from '../constants';
import { UserProfile } from '../types';
import { ChevronRight, MapPin, Wheat, LayoutGrid, Leaf } from 'lucide-react';
import { userService } from '../src/services/api';

interface ProfileScreenProps {
  onComplete: (profile: UserProfile) => void;
  t: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onComplete, t }) => {
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

  const removeCrop = (cropToRemove: string) => {
    setCrops(crops.filter(c => c !== cropToRemove));
  };

  return (
    <div className="h-full flex flex-col px-6 pt-12 bg-white pb-10 overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.create_profile}</h2>
      <p className="text-gray-500 mb-8 text-sm">{t.farm_details}</p>

      <div className="space-y-8">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">{t.full_name}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Ramesh Kumar"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900 font-bold"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">{t.district}</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-green-700" size={18} />
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Nagpur"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900 font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">{t.land_size}</label>
            <input
              type="number"
              value={landSize || ''}
              onChange={(e) => setLandSize(parseFloat(e.target.value))}
              placeholder="2.5"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900 font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">{t.category}</label>
            <select
              value={category}
              onChange={(e: any) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900 font-bold appearance-none"
            >
              <option value="General">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">{t.farming_type}</label>
            <select
              value={farmingType}
              onChange={(e: any) => setFarmingType(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900 font-bold appearance-none"
            >
              <option value="Mixed">Mixed</option>
              <option value="Organic">Organic</option>
              <option value="Conventional">Conventional</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">{t.crops_grow || 'Your Crops'}</label>

          {/* Crop Grid - Image Based Selection */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { name: 'Wheat', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&auto=format&fit=crop&q=60' },
              { name: 'Rice', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=60' },
              { name: 'Cotton', image: '/assets/crops/cotton.jpg' },
              { name: 'Tomato', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=60' },
              { name: 'Potato', image: 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=400&auto=format&fit=crop&q=60' },
              { name: 'Corn', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&auto=format&fit=crop&q=60' },
              { name: 'Soybean', image: '/assets/crops/soybean.jpg' },
              { name: 'Sugarcane', image: '/assets/crops/sugarcane.jpg' },
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
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all active:scale-95 ${isSelected
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                >
                  <div className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center ${isSelected ? 'shadow-md ring-2 ring-green-500 ring-offset-2' : 'bg-gray-50'
                    }`}>
                    <img
                      src={crop.image}
                      alt={crop.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-green-700' : 'text-gray-600'
                    }`}>
                    {crop.name}
                  </span>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
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
            <div className="flex flex-wrap gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
              <span className="text-[10px] font-black text-green-700 uppercase tracking-wider">Selected:</span>
              {crops.map((crop) => (
                <span key={crop} className="text-xs font-bold text-green-800">{crop}</span>
              )).reduce((prev, curr) => [prev, ', ', curr] as any)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pb-10">
        <button
          onClick={handleSave}
          disabled={!name || !district || loading}
          className="w-full py-4 rounded-2xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
          style={{ backgroundColor: COLORS.primary }}
        >
          {loading ? 'Saving...' : t.complete_profile}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default ProfileScreen;
