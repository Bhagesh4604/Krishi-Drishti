
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Screen, Listing } from '../types';
import { marketService } from '../src/services/api';
import {
  Search,
  Filter,
  TrendingUp,
  BadgeCheck,
  Gavel,
  Clock,
  MapPin,
  ChevronRight,
  Plus,
  X,
  Camera,
  Package,
  Tag,
  ShieldCheck,
  Sparkles,
  SearchIcon,
  Globe,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Mic,
  MicOff,
  Type,
  Volume2,
  Leaf,
  Scale,
  ShieldAlert,
  LayoutGrid,
  Map,
  ArrowUpDown,
  BarChart3,
  ShoppingCart,
  Bell,
  ArrowLeft
} from 'lucide-react';
import { COLORS } from '../constants';

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

  // Use real land size from Profile if available, else default to 2
  const [userProfile, setUserProfile] = useState<any>(null);

  // GPS State
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    // 1. Fetch user profile for Land Size
    const loadUser = async () => {
      try {
        const { userService } = await import('../src/services/api');
        const p = await userService.getProfile();
        setUserProfile(p);
      } catch (e) { }
    }
    loadUser();

    // 2. Get GPS Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location", error);
        }
      );
    }
  }, []);

  const VERIFIED_LAND_ACRES = userProfile?.land_size || 2.5;
  const ESTIMATED_MAX_QUOTA = VERIFIED_LAND_ACRES * 5000; // 5000kg per acre assumption

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

    // Filter by Tab (Category) - Mock logic, assume all crops for now or filter by name
    if (tab === 'grains') result = result.filter(l => ['wheat', 'rice', 'corn', 'soybean'].some(c => l.crop.toLowerCase().includes(c)));
    if (tab === 'fruits') result = result.filter(l => ['mango', 'apple', 'banana', 'grapes'].some(c => l.crop.toLowerCase().includes(c)));
    if (tab === 'vegetables') result = result.filter(l => ['potato', 'onion', 'tomato', 'brinjal'].some(c => l.crop.toLowerCase().includes(c)));

    if (searchQuery) {
      result = result.filter(l => l.crop.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return result;
  }, [listings, tab, searchQuery]);

  // Load listings on mount or when location changes
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

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNewListing(prev => ({
          ...prev,
          description: prev.description ? `${prev.description} ${transcript}` : transcript
        }));
        setIsRecording(false);
      };

      recognitionRef.current.onerror = () => setIsRecording(false);
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  const toggleVoiceNote = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!recognitionRef.current) {
        alert("Voice recognition not supported in this browser.");
        return;
      }
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleAddListing = async () => {
    if (!newListing.crop || !newListing.price || !newListing.quantity) return;
    if (isOverQuota) return;

    // Construct simplified object for API
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
        crop: '',
        price: '',
        quantity: '',
        loc: '',
        category: 'Crop',
        description: '',
        isOrganic: false,
        image: ''
      });
    } catch (e: any) {
      console.error("Failed to create listing", e);
      alert("Failed to create listing");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="bg-[#f8fafc] min-h-full pb-24 relative font-sans">

      {/* 1. Minimalist Header */}
      <div className="px-6 pt-12 pb-6 bg-white sticky top-0 z-30 flex justify-between items-start shadow-sm">
        <button onClick={() => navigateTo('home')} className="p-2 -ml-2 text-gray-400">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Your <span className="font-bold text-gray-900">Mandi</span></h2>
          <div className="flex items-center gap-1 mt-1 text-gray-600 self-start px-2 py-1 rounded-lg">
            <MapPin size={16} className="text-gray-500" fill="currentColor" />
            <span className="text-sm font-medium tracking-wide">Nagpur, India</span>
          </div>
        </div>
        <button
          className="p-3 bg-white rounded-full shadow-lg shadow-orange-100/50 relative hover:bg-orange-50 transition-colors active:scale-95"
          onClick={() => {}} // Placeholder for notification action
        >
          <div className="w-2 h-2 bg-black rounded-full absolute top-3 right-3 border border-white pointer-events-none" />
          <Bell size={20} className="text-gray-900" fill="black" />
        </button>
      </div>

      {/* 2. Hero Card (3D Style) */}
      <div className="px-6 mt-6">
        <div className="bg-[#E9F4E9] rounded-[2.5rem] p-6 relative overflow-hidden h-48 flex flex-col justify-center">
          <div className="relative z-10 max-w-[60%]">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <TrendingUp size={16} className="text-green-600" />
              </div>
              <span className="text-xs font-bold text-green-800 uppercase tracking-widest">Top Commodity</span>
            </div>
            <h3 className="text-3xl font-black text-green-900 leading-none mb-4">Organic<br />Wheat</h3>
            <button className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-green-200 active:scale-95 transition-transform">
              View Trends
            </button>
          </div>

          {/* 3D Illustration Placeholder */}
          <img
            src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=60"
            className="absolute -right-4 top-4 w-40 h-40 object-contain drop-shadow-2xl rotate-12"
            style={{ clipPath: 'circle(50%)' }}
          />
        </div>
      </div>

      {/* 3. Categories (Pill Tabs) */}
      <div className="px-6 mt-8">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {['All', 'Grains', 'Vegetables', 'Fruits', 'Machinery'].map((cat) => (
            <button
              key={cat}
              onClick={() => setTab(cat.toLowerCase() as any)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${tab === cat.toLowerCase() || (tab === 'all' && cat === 'All')
                ? 'bg-green-700 text-white shadow-lg shadow-green-200'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Listings Grid (2-Column) */}
      <div className="px-6 mt-6">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-xl font-bold text-gray-900">Fresh Listings</h3>
          <button className="text-xs font-bold text-gray-400">Filter</button>
        </div>

        {filteredListings.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center opacity-40">
            <LayoutGrid size={48} className="mb-4 text-gray-300" />
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No listings found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredListings.map((item) => (
              <div
                key={item.id}
                onClick={() => navigateTo('market-detail', { listing: item })}
                className="bg-white p-3 rounded-[2rem] shadow-sm border border-gray-100 active:scale-[0.98] transition-transform group"
              >
                <div className="relative h-32 rounded-[1.5rem] overflow-hidden mb-3">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  {item.isOrganic && (
                    <div className="absolute top-2 left-2 bg-green-500/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">
                      Organic
                    </div>
                  )}
                  <button className="absolute top-2 right-2 w-6 h-6 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white active:bg-red-500 transition-colors">
                    <span className="text-[10px]">♥</span>
                  </button>
                </div>

                <div className="px-1">
                  <h4 className="text-sm font-bold text-gray-900 mb-0.5 truncate">{item.crop}</h4>
                  <p className="text-[10px] text-gray-400 font-medium mb-2 flex items-center gap-1">
                    <MapPin size={10} /> {item.loc}
                  </p>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Price</p>
                      <p className="text-lg font-black text-green-700 leading-none">{item.price.split('/')[0]}</p>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Sell Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-green-600 text-white rounded-full shadow-[0_4px_20px_rgba(22,163,74,0.4)] flex items-center justify-center active:scale-90 transition-transform z-40 border-4 border-white"
      >
        <Plus size={24} strokeWidth={3} />
      </button>

      {/* SELL FORM MODAL (Simplified for Redesign) */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-t-[3rem] shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900">New Listing</h3>
              <button onClick={() => setShowAddForm(false)} className="p-2 bg-gray-50 rounded-full text-gray-400"><X size={20} /></button>
            </div>

            <div className="space-y-4 overflow-y-auto pb-4">

              {/* Product Details Section */}
              <div className="space-y-4">
                {/* Image Generation */}
                <div className="relative h-48 rounded-[1.5rem] bg-gray-100 overflow-hidden border border-gray-200 group">
                  {newListing.image ? (
                    <div className="relative w-full h-full">
                      <img src={newListing.image} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setNewListing({ ...newListing, image: '' })}
                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                      <Camera size={32} />
                      <span className="text-xs font-bold uppercase">AI Generating Preview...</span>
                    </div>
                  )}

                  {!newListing.image && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="px-4 py-2 bg-white rounded-full shadow-lg text-xs font-bold uppercase tracking-widest"
                      >
                        Upload Custom
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setNewListing({ ...newListing, image: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                {/* Simplified Fields */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Crop Name</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    placeholder="e.g. Tomato"
                    value={newListing.crop}
                    onChange={e => {
                      const crop = e.target.value;
                      setNewListing({
                        ...newListing,
                        crop,
                        // Enhanced AI Auto Image: Use specific robust source
                        image: crop.length > 2 ? `https://source.unsplash.com/800x600/?${crop},agriculture,food` : ''
                      });
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Description</label>
                  <textarea
                    className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-500 transition-all min-h-[100px] resize-none"
                    placeholder="Describe quality, harvest date, etc..."
                    value={newListing.description}
                    onChange={e => setNewListing({ ...newListing, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Price (₹)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      placeholder="40"
                      value={newListing.price}
                      onChange={e => setNewListing({ ...newListing, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Qty (kg)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      placeholder="100"
                      value={newListing.quantity}
                      onChange={e => setNewListing({ ...newListing, quantity: e.target.value })}
                    />
                  </div>
                </div>

                {/* Quota Indicator */}
                <div className="p-4 bg-gray-900 rounded-2xl text-white flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Quota Usage</p>
                    <p className={`text-sm font-black ${isOverQuota ? 'text-red-400' : 'text-green-400'}`}>
                      {parseInt(newListing.quantity || '0')}/{ESTIMATED_MAX_QUOTA} kg
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full border-2 border-white/20 flex items-center justify-center">
                    <span className="text-[10px] font-bold">{Math.round((parseInt(newListing.quantity || '0') / ESTIMATED_MAX_QUOTA) * 100)}%</span>
                  </div>
                </div>

                <button
                  onClick={handleAddListing}
                  disabled={isOverQuota || !newListing.crop}
                  className="w-full py-4 bg-green-600 text-white rounded-[1.5rem] font-bold shadow-xl shadow-green-200 mt-4 active:scale-95 transition-transform"
                >
                  Post Listing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MarketScreen;
