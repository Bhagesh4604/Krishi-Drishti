import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Screen, Listing } from '../types';
import { marketService, getUserLocation } from '../src/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  TrendingUp,
  MapPin,
  Plus,
  X,
  Camera,
  ShoppingCart,
  Bell,
  ArrowLeft,
  LayoutGrid
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
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [userProfile, setUserProfile] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { userService } = await import('../src/services/api');
        const p = await userService.getProfile();
        setUserProfile(p);
      } catch (e) { }
    }
    loadUser();
    getUserLocation().then(loc => setLocation(loc)).catch(() => {});
  }, []);

  const VERIFIED_LAND_ACRES = userProfile?.land_size || 2.5;
  const ESTIMATED_MAX_QUOTA = VERIFIED_LAND_ACRES * 5000;

  const [newListing, setNewListing] = useState({
    crop: '',
    price: '',
    quantity: '',
    loc: '',
    category: 'Crop',
    description: '',
    isOrganic: false,
    image: ''
  });

  const isOverQuota = parseInt(newListing.quantity) > ESTIMATED_MAX_QUOTA && newListing.isOrganic;

  const filteredListings = useMemo(() => {
    let result = listings;
    if (tab === 'grains') result = result.filter(l => ['wheat', 'rice', 'corn', 'soybean'].some(c => l.crop.toLowerCase().includes(c)));
    if (tab === 'fruits') result = result.filter(l => ['mango', 'apple', 'banana', 'grapes'].some(c => l.crop.toLowerCase().includes(c)));
    if (tab === 'vegetables') result = result.filter(l => ['potato', 'onion', 'tomato', 'brinjal'].some(c => l.crop.toLowerCase().includes(c)));

    if (searchQuery) {
      result = result.filter(l => l.crop.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [listings, tab, searchQuery]);

  useEffect(() => {
    fetchListings();
  }, [location]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const data = await marketService.getListings({
        lat: location?.lat,
        lng: location?.lng
      });
      setListings(data);
    } catch (e) {
      console.error("Failed to load listings", e);
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
      setNewListing({
        crop: '', price: '', quantity: '', loc: '', category: 'Crop', description: '', isOrganic: false, image: ''
      });
    } catch (e: any) {
      alert("Failed to create listing");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-[#f8fafc] min-h-full pb-24 relative font-sans"
    >
      {/* 1. Minimalist Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="px-6 pt-12 pb-6 bg-white/90 backdrop-blur-xl sticky top-0 z-30 flex justify-between items-start shadow-sm"
      >
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigateTo('home')} className="p-2 -ml-2 text-gray-400">
          <ArrowLeft size={24} />
        </motion.button>
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Your <span className="font-bold text-gray-900">Mandi</span></h2>
          <div className="flex items-center gap-1 mt-1 text-gray-600 self-start px-2 py-1 rounded-lg">
            <MapPin size={16} className="text-gray-500" fill="currentColor" />
            <span className="text-sm font-medium tracking-wide">Nagpur, India</span>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          className="p-3 bg-white rounded-full shadow-lg shadow-orange-100/50 relative hover:bg-orange-50 transition-colors"
        >
          <div className="w-2 h-2 bg-emerald-500 rounded-full absolute top-3 right-3 border border-white pointer-events-none" />
          <Bell size={20} className="text-gray-900" fill="black" />
        </motion.button>
      </motion.div>

      {/* 2. Hero Card */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
        className="px-6 mt-6"
      >
        <div className="glass-dark rounded-[2.5rem] p-6 relative overflow-hidden h-48 flex flex-col justify-center border border-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.2)]">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/40 to-emerald-900/40 pointer-events-none"></div>
          <div className="relative z-10 max-w-[60%]">
            <div className="flex items-center gap-2 mb-2">
              <div className="glass p-1.5 rounded-lg shadow-sm border border-white/20">
                <TrendingUp size={16} className="text-emerald-400" />
              </div>
              <span className="text-xs font-bold text-emerald-100 uppercase tracking-widest">Top Commodity</span>
            </div>
            <h3 className="text-3xl font-black text-white leading-none mb-4 drop-shadow-lg">Organic<br />Wheat</h3>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="glass text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-transform border border-emerald-400/50"
            >
              View Trends
            </motion.button>
          </div>
          <motion.img
            animate={{ rotate: 12, scale: [1, 1.05, 1] }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
            src="https://images.unsplash.com/photo-1501430654243-c934cec2e1c0?w=800"
            className="absolute -right-4 top-4 w-40 h-40 object-cover rounded-full shadow-[0_0_30px_rgba(16,185,129,0.3)] border-4 border-emerald-500/20"
          />
        </div>
      </motion.div>

      {/* 3. Categories (Premium Chips) */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="px-6 mt-8"
      >
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {['All', 'Grains', 'Vegetables', 'Fruits', 'Machinery'].map((cat) => (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={cat}
              onClick={() => setTab(cat.toLowerCase() as any)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 relative ${tab === cat.toLowerCase() || (tab === 'all' && cat === 'All')
                ? 'text-white'
                : 'glass text-gray-600 border border-gray-200 hover:bg-white'
                }`}
            >
              {tab === cat.toLowerCase() || (tab === 'all' && cat === 'All') ? (
                <motion.div 
                  layoutId="tab-indicator" 
                  className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full -z-10 shadow-[0_4px_15px_rgba(16,185,129,0.4)]"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              ) : null}
              {cat}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* 4. Listings Grid (2-Column) */}
      <div className="px-6 mt-6">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-xl font-bold text-gray-900">Fresh Listings</h3>
        </div>

        {filteredListings.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 flex flex-col items-center text-center opacity-40">
            <LayoutGrid size={48} className="mb-4 text-gray-300" />
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No listings found</p>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-4"
          >
            {filteredListings.map((item) => (
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                key={item.id}
                onClick={() => navigateTo('market-detail', { listing: item })}
                className="glass p-3 rounded-[2rem] shadow-sm border border-white transition-all group cursor-pointer"
              >
                <div className="relative h-32 rounded-[1.5rem] overflow-hidden mb-3 border border-gray-100 shadow-inner">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {item.isOrganic && (
                    <div className="absolute top-2 left-2 bg-emerald-500/90 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[8px] font-black uppercase shadow-lg border border-emerald-400">
                      Organic
                    </div>
                  )}
                </div>

                <div className="px-1">
                  <h4 className="text-sm font-bold text-gray-900 mb-0.5 truncate group-hover:text-emerald-700 transition-colors">{item.crop}</h4>
                  <p className="text-[10px] text-gray-400 font-medium mb-3 flex items-center gap-1">
                    <MapPin size={10} className="text-emerald-500" /> {item.loc}
                  </p>

                  <div className="flex justify-between items-end bg-white/50 rounded-xl p-2 -mx-1 border border-emerald-50/50 group-hover:bg-emerald-50/50 transition-colors">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Price</p>
                      <p className="text-lg font-black text-emerald-700 leading-none">{item.price.split('/')[0]}</p>
                    </div>
                    <motion.button whileTap={{ scale: 0.8 }} className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <ShoppingCart size={14} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Floating Sell Button */}
      <motion.button
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, delay: 0.5 }}
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-full shadow-[0_8px_30px_rgba(16,185,129,0.4)] flex items-center justify-center z-40 border-2 border-white"
      >
        <Plus size={24} strokeWidth={3} />
      </motion.button>

      {/* SELL FORM MODAL */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-md bg-white rounded-t-[3rem] shadow-2xl flex flex-col p-6 max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900">New Listing</h3>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAddForm(false)} className="p-2 bg-gray-50 rounded-full text-gray-400">
                  <X size={20} />
                </motion.button>
              </div>

              <div className="space-y-4 overflow-y-auto pb-4">
                <div className="space-y-4">
                  <div className="relative h-48 rounded-[1.5rem] bg-gray-100 overflow-hidden border border-gray-200 group">
                    {newListing.image ? (
                      <div className="relative w-full h-full">
                        <img src={newListing.image} className="w-full h-full object-cover" />
                        <button onClick={() => setNewListing({ ...newListing, image: '' })} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <Camera size={32} />
                        <span className="text-xs font-bold uppercase">Ready</span>
                      </div>
                    )}
                    {!newListing.image && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => document.getElementById('file-upload')?.click()} className="px-4 py-2 bg-white rounded-full shadow-lg text-xs font-bold uppercase">
                          Upload Custom
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="file" id="file-upload" className="hidden" accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setNewListing({ ...newListing, image: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Crop Name</label>
                    <input
                      type="text" className="w-full bg-gray-50 p-4 rounded-xl font-bold text-gray-900 outline-none"
                      placeholder="e.g. Tomato" value={newListing.crop}
                      onChange={e => setNewListing({ ...newListing, crop: e.target.value, image: e.target.value.length > 2 ? `https://source.unsplash.com/800x600/?${e.target.value},agriculture` : '' })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Description</label>
                    <textarea
                      className="w-full bg-gray-50 p-4 rounded-xl font-bold text-gray-900 outline-none min-h-[80px]"
                      placeholder="Describe quality..." value={newListing.description}
                      onChange={e => setNewListing({ ...newListing, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Price (₹)</label>
                      <input type="number" className="w-full bg-gray-50 p-4 rounded-xl font-bold outline-none" value={newListing.price} onChange={e => setNewListing({ ...newListing, price: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Qty (kg)</label>
                      <input type="number" className="w-full bg-gray-50 p-4 rounded-xl font-bold outline-none" value={newListing.quantity} onChange={e => setNewListing({ ...newListing, quantity: e.target.value })} />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddListing}
                    disabled={isOverQuota || !newListing.crop}
                    className="w-full py-4 bg-green-600 text-white rounded-[1.5rem] font-bold shadow-xl shadow-green-200 mt-4 disabled:opacity-50"
                  >
                    Post Listing
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default MarketScreen;
