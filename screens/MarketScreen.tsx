// Design tokens from template
const C = { primary: '#00BB78', dark: '#001A11', gray: '#616B68', mint: '#A5FFA7', bg: '#E8FBF3' };

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Screen, Listing } from '../types';
import { marketService, getUserLocation } from '../src/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  TrendingUp,
  MapPin,
  Plus,
  X,
  Camera,
  ShoppingCart,
  ArrowLeft,
  ChevronRight,
  Leaf,
} from 'lucide-react';

interface MarketScreenProps {
  navigateTo: (screen: Screen, data?: any) => void;
  t: any;
}

const MarketScreen: React.FC<MarketScreenProps> = ({ navigateTo, t }) => {
  const [tab, setTab] = useState<'all' | 'grains' | 'fruits' | 'vegetables'>('all');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { userService } = await import('../src/services/api');
        const p = await userService.getProfile();
        setUserProfile(p);
      } catch (e) {}
    };
    loadUser();
    getUserLocation().then(loc => setLocation(loc)).catch(() => {});
  }, []);

  const [newListing, setNewListing] = useState({
    crop: '', price: '', quantity: '', loc: '',
    category: 'Crop', description: '', isOrganic: false, image: ''
  });

  const VERIFIED_LAND_ACRES = userProfile?.land_size || 2.5;
  const ESTIMATED_MAX_QUOTA = VERIFIED_LAND_ACRES * 5000;
  const isOverQuota = parseInt(newListing.quantity) > ESTIMATED_MAX_QUOTA && newListing.isOrganic;

  const filteredListings = useMemo(() => {
    let result = listings;
    if (tab === 'grains') result = result.filter(l => ['wheat', 'rice', 'corn', 'soybean'].some(c => l.crop.toLowerCase().includes(c)));
    if (tab === 'fruits') result = result.filter(l => ['mango', 'apple', 'banana', 'grapes'].some(c => l.crop.toLowerCase().includes(c)));
    if (tab === 'vegetables') result = result.filter(l => ['potato', 'onion', 'tomato', 'brinjal'].some(c => l.crop.toLowerCase().includes(c)));
    if (searchQuery) result = result.filter(l => l.crop.toLowerCase().includes(searchQuery.toLowerCase()));
    return result;
  }, [listings, tab, searchQuery]);

  useEffect(() => { fetchListings(); }, [location]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const data = await marketService.getListings({ lat: location?.lat, lng: location?.lng });
      setListings(data);
    } catch (e) {
      console.error('Failed to load listings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddListing = async () => {
    if (!newListing.crop || !newListing.price || !newListing.quantity) return;
    if (isOverQuota) return;
    const entryData = {
      crop_name: newListing.crop,
      quantity: `${newListing.quantity}kg`,
      price: `₹${newListing.price}/${newListing.category === 'Crop' ? 'kg' : 'unit'}`,
      location: newListing.loc || 'My Farm',
      description: newListing.description || 'Fresh produce listed via Mandi Direct.',
      is_organic: newListing.isOrganic,
      image_url: newListing.image
    };
    try {
      setLoading(true);
      const createdListing = await marketService.createListing(entryData);
      setListings(prev => [createdListing, ...prev]);
      setShowAddForm(false);
      setNewListing({ crop: '', price: '', quantity: '', loc: '', category: 'Crop', description: '', isOrganic: false, image: '' });
    } catch (e: any) {
      alert('Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { key: 'all', label: 'All' },
    { key: 'grains', label: 'Grains' },
    { key: 'vegetables', label: 'Vegetables' },
    { key: 'fruits', label: 'Fruits' },
  ];

  return (
    <div className="bg-white min-h-full pb-24" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ─── HEADER ─── */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between bg-white sticky top-0 z-30" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateTo('home')} className="w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-transform" style={{ background: '#F5F5F5', border: '1px solid #EBEBEB' }}>
            <ArrowLeft size={16} style={{ color: C.dark }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: C.dark }}>Marketplace</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={11} style={{ color: C.primary }} />
              <span className="text-[11px]" style={{ color: C.gray }}>Nagpur, India</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 text-white text-xs font-semibold px-3.5 py-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: C.primary }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Sell
          </button>
        </div>
      </div>

      {/* ─── SEARCH BAR ─── */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search crop, location..."
            className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ─── FEATURED BANNER ─── */}
      <div className="mx-5 mb-4 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)' }}>
        <div className="flex items-center p-4">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={12} className="text-green-300" />
              <span className="text-[10px] font-semibold text-green-300 uppercase tracking-wider">Featured Products</span>
            </div>
            <h2 className="text-base font-bold text-white leading-snug">Organic Wheat</h2>
            <p className="text-xs text-green-200 mt-0.5">₹2400 / quintal · Nagpur</p>
            <button className="mt-2.5 bg-white text-green-700 text-[11px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
              Shop Now
            </button>
          </div>
          <img
            src="https://images.unsplash.com/photo-1501430654243-c934cec2e1c0?w=300&q=80"
            className="w-20 h-20 object-cover rounded-xl ml-4 flex-shrink-0"
            alt="Wheat"
          />
        </div>
      </div>

      {/* ─── CATEGORY TABS ─── */}
      <div className="px-5 mb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0"
              style={{
                background: tab === t.key ? C.primary : '#F5F5F5',
                color: tab === t.key ? '#fff' : C.gray,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── SECTION TITLE ─── */}
      <div className="px-5 mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-800">Fresh Listings</h2>
        <span className="text-xs text-gray-400">{filteredListings.length} results</span>
      </div>

      {/* ─── LISTINGS ─── */}
      <div className="px-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: '#F5F5F5' }} />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: C.bg }}>
              <ShoppingCart size={28} style={{ color: C.primary }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: C.dark }}>No listings found</p>
            <p className="text-xs mt-1" style={{ color: C.gray }}>Be the first to add a listing</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredListings.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigateTo('market-detail', { listing: item })}
                className="w-full flex items-center gap-4 p-3.5 bg-white rounded-2xl text-left transition-colors"
                style={{ border: '1px solid #F0F0F0', boxShadow: '0 1px 4px rgba(0,187,120,0.04)' }}
              >
                {/* Crop image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '1px solid #F0F0F0' }}>
                  <img
                    src={item.image || `https://images.unsplash.com/photo-1501430654243-c934cec2e1c0?w=200&q=80`}
                    alt={item.crop}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  {item.isOrganic && (
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.primary }}>Organic</span>
                  )}
                  <h3 className="text-sm font-bold mt-0.5 truncate" style={{ color: C.dark }}>{item.crop}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} style={{ color: C.gray }} />
                    <span className="text-[11px] truncate" style={{ color: C.gray }}>{item.loc}</span>
                  </div>
                  <p className="text-sm font-bold mt-1" style={{ color: C.primary }}>
                    {item.price.split('/')[0]}<span className="text-xs font-normal" style={{ color: C.gray }}>/{item.price.split('/')[1]}</span>
                  </p>
                </div>

                {/* Action */}
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <button
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: C.bg, color: C.primary, border: `1px solid ${C.mint}` }}
                  >
                    <ShoppingCart size={12} />
                    Buy
                  </button>
                  <ChevronRight size={14} style={{ color: C.mint }} />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* ─── SELL FORM MODAL ─── */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh]"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">New Listing</h3>
                <button onClick={() => setShowAddForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:scale-95 transition-transform">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Image picker */}
                <div className="relative h-36 rounded-2xl bg-gray-50 border border-dashed border-gray-200 overflow-hidden flex items-center justify-center">
                  {newListing.image ? (
                    <>
                      <img src={newListing.image} className="w-full h-full object-cover" />
                      <button onClick={() => setNewListing({ ...newListing, image: '' })} className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center">
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => document.getElementById('file-upload')?.click()} className="flex flex-col items-center gap-2 text-gray-400">
                      <Camera size={24} />
                      <span className="text-xs font-semibold">Add Photo</span>
                    </button>
                  )}
                </div>
                <input type="file" id="file-upload" className="hidden" accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setNewListing({ ...newListing, image: reader.result as string });
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                {/* Form fields */}
                {[
                  { label: 'Crop Name', key: 'crop', placeholder: 'e.g. Tomato', type: 'text' },
                  { label: 'Description', key: 'description', placeholder: 'Describe quality…', type: 'text' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{field.label}</label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-green-400 transition-colors"
                      value={(newListing as any)[field.key]}
                      onChange={e => setNewListing({ ...newListing, [field.key]: e.target.value })}
                    />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Price (₹)</label>
                    <input
                      type="number" placeholder="e.g. 2400"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-green-400 transition-colors"
                      value={newListing.price}
                      onChange={e => setNewListing({ ...newListing, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Qty (kg)</label>
                    <input
                      type="number" placeholder="e.g. 500"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-green-400 transition-colors"
                      value={newListing.quantity}
                      onChange={e => setNewListing({ ...newListing, quantity: e.target.value })}
                    />
                  </div>
                </div>

                {/* Organic toggle */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Leaf size={16} className="text-green-600" />
                    <span className="text-sm font-semibold text-gray-800">Mark as Organic</span>
                  </div>
                  <button
                    onClick={() => setNewListing({ ...newListing, isOrganic: !newListing.isOrganic })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${newListing.isOrganic ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${newListing.isOrganic ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {/* Submit */}
                <button
                  onClick={handleAddListing}
                  disabled={isOverQuota || !newListing.crop || !newListing.price}
                  className="w-full py-4 text-white font-bold rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-40"
                  style={{ background: C.primary }}
                >
                  Post Listing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketScreen;
