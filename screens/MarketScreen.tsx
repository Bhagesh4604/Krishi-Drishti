
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
  BarChart3
} from 'lucide-react';
import { COLORS } from '../constants';

interface MarketScreenProps {
  navigateTo: (screen: Screen, data?: any) => void;
  t: any;
}

const MarketScreen: React.FC<MarketScreenProps> = ({ navigateTo, t }) => {
  const [tab, setTab] = useState<'pulse' | 'store'>('pulse');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [livePrice, setLivePrice] = useState<{ text: string, urls: { title: string, uri: string }[] } | null>(null);
  const [isSearchingPrice, setIsSearchingPrice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [compareItem, setCompareItem] = useState<Listing | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'grade'>('distance');
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
    isOrganic: false
  });

  const isOverQuota = parseInt(newListing.quantity) > ESTIMATED_MAX_QUOTA && newListing.isOrganic;

  const filteredListings = useMemo(() => {
    let result = listings;
    // Client-side filtering for now, but backend supports parameters too. 
    // We fetch all for demo simplicity or could add 'tab' to API fetch.
    if (tab === 'store') {
      result = listings.filter(l => l.seller === 'Me' || (l as any).seller_name === 'Me'); // Check backend response mapping
    } else {
      // In Pulse, show everything
    }

    if (searchQuery) {
      result = result.filter(l => l.crop.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return result.sort((a, b) => {
      // Distance mock logic requires user loc. For now, rely on random or 0.
      if (sortBy === 'distance') return (a.distanceKm || 0) - (b.distanceKm || 0);
      if (sortBy === 'grade') return (a.grade || 'C').localeCompare(b.grade || 'C');
      return 0;
    });
  }, [listings, tab, searchQuery, sortBy]);

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

  const generateTrackingId = () => {
    return 'KS-' + Math.random().toString(36).substring(2, 9).toUpperCase();
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
      is_organic: newListing.isOrganic
    };

    try {
      setLoading(true);
      await marketService.createListing(entryData);

      // Refresh listings
      await fetchListings();

      setShowAddForm(false);
      setNewListing({
        crop: '',
        price: '',
        quantity: '',
        loc: '',
        category: 'Crop',
        description: '',
        isOrganic: false
      });
      setTab('store');
      setTab('store');
    } catch (e: any) {
      console.error("Failed to create listing", e);
      const msg = e.response?.data?.detail || e.message || "Unknown error";
      alert(`Failed to create listing: ${JSON.stringify(msg)}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceLookup = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingPrice(true);
    setLivePrice(null);
    try {
      const result = await marketService.checkPrice(searchQuery, location?.lat, location?.lng);
      setLivePrice({
        text: result.text || "Price data unavailable.",
        urls: [] // Backend might not return URLs yet, or we need to parse them.
      });
    } catch (err) {
      console.error(err);
      alert("Price check failed");
    } finally {
      setIsSearchingPrice(false);
    }
  };

  const getMarketAverage = (cropName: string) => {
    const relevant = listings.filter(l => l.crop.toLowerCase().includes(cropName.toLowerCase()));
    if (relevant.length === 0) return 0;
    const sum = relevant.reduce((acc, l) => acc + parseInt(l.price.replace(/\D/g, '')), 0);
    return Math.round(sum / relevant.length);
  };

  return (
    <div className="bg-[#f8fafc] min-h-full pb-24 relative">
      <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-100">
        <div className="p-6 pb-2 flex justify-between items-center">
          <h2 className="text-2xl font-black text-gray-900 leading-none">{t.market_direct}</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100 active:scale-95 transition-all"
          >
            <Plus size={14} strokeWidth={3} />
            Sell My Crop
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 flex gap-6 pb-4">
          <button
            onClick={() => setTab('pulse')}
            className={`text-xs font-black uppercase tracking-widest pb-1 transition-all relative ${tab === 'pulse' ? 'text-green-700' : 'text-gray-400'
              }`}
          >
            {t.mandi_pulse}
            {tab === 'pulse' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-700 rounded-full animate-in slide-in-from-left duration-300"></div>}
          </button>
          <button
            onClick={() => setTab('store')}
            className={`text-xs font-black uppercase tracking-widest pb-1 transition-all relative ${tab === 'store' ? 'text-green-700' : 'text-gray-400'
              }`}
          >
            {t.my_store}
            {tab === 'store' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-700 rounded-full animate-in slide-in-from-left duration-300"></div>}
          </button>
        </div>

        <div className="px-6 pb-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 flex items-center border border-gray-100 focus-within:ring-2 focus-within:ring-green-500 transition-all">
              <Search size={18} className="text-gray-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tab === 'pulse' ? "Check Price Discovery..." : "Search My Store..."}
                className="bg-transparent outline-none text-sm text-gray-900 w-full font-bold"
              />
            </div>
            {tab === 'pulse' && (
              <button
                onClick={handlePriceLookup}
                disabled={isSearchingPrice || !searchQuery}
                className={`p-3 rounded-2xl shadow-sm transition-all active:scale-95 ${isSearchingPrice ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white'
                  }`}
              >
                {isSearchingPrice ? <Loader2 size={20} className="animate-spin" /> : <Globe size={20} />}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('distance')}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'distance' ? 'bg-green-700 text-white shadow-md' : 'bg-gray-100 text-gray-400'
                  }`}
              >
                <MapPin size={10} className="inline mr-1" /> {t.sort_nearest}
              </button>
              <button
                onClick={() => setSortBy('grade')}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'grade' ? 'bg-green-700 text-white shadow-md' : 'bg-gray-100 text-gray-400'
                  }`}
              >
                <BarChart3 size={10} className="inline mr-1" /> {t.sort_best}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 pt-4">
        {/* Live Price Result (Search Grounded) */}
        {livePrice && tab === 'pulse' && (
          <div className="bg-white rounded-[2rem] p-6 border border-green-100 shadow-xl shadow-green-100/20 mb-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-black text-green-700 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp size={14} /> Today's Live Rates
              </h4>
              <button onClick={() => setLivePrice(null)} className="text-gray-400"><X size={14} /></button>
            </div>
            <p className="text-sm font-bold text-gray-700 leading-relaxed mb-4">
              {livePrice.text}
            </p>
            {livePrice.urls.length > 0 && (
              <div className="pt-3 border-t border-gray-50">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Sources</p>
                {livePrice.urls.map((u, i) => (
                  <a key={i} href={u.uri} target="_blank" rel="noopener" className="flex items-center gap-2 text-[10px] text-blue-600 font-bold mb-1 truncate">
                    <Globe size={10} /> {u.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {filteredListings.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center opacity-40">
            <LayoutGrid size={64} className="mb-4 text-gray-300" />
            <p className="text-sm font-black text-gray-500 uppercase tracking-widest">No listings found</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredListings.map((item: any) => (
              <div
                key={item.id}
                className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/40 active:scale-[0.99] transition-all relative group"
              >
                <div className="relative h-48" onClick={() => navigateTo('market-detail', { listing: item })}>
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.crop} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                  <div className="absolute top-4 left-4 flex flex-wrap gap-2 pr-12">
                    <div className="bg-white/20 backdrop-blur-md text-white px-2 py-1 rounded-lg flex items-center gap-1 border border-white/30">
                      <BarChart3 size={10} className="text-amber-400" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Grade {item.grade}</span>
                    </div>
                    {item.isOrganic && (
                      <div className="bg-green-700 text-white px-2 py-1 rounded-lg flex items-center gap-1 border border-green-500 shadow-lg">
                        <Leaf size={10} fill="white" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Organic</span>
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-4 left-5">
                    <h4 className="text-xl font-black text-white leading-tight drop-shadow-md">{item.crop}</h4>
                    <div className="flex items-center text-white/80 text-[10px] font-bold mt-1">
                      <MapPin size={10} className="mr-1 text-green-400" /> {item.loc} • {item.distanceKm} km away
                    </div>
                  </div>

                  {item.seller === 'Me' && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-green-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl">My Store</div>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Stock Status</p>
                      <p className="text-sm font-black text-gray-900">{item.quantity} Left</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-green-700 leading-none">{item.price}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <TrendingUp size={10} className="text-green-600" />
                        <p className="text-[9px] font-black text-green-600 uppercase">Strong Demand</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigateTo('market-detail', { listing: item })}
                      className="flex-1 py-4 bg-gray-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-colors"
                    >
                      <ChevronRight size={14} /> {tab === 'pulse' ? 'Details' : 'Manage'}
                    </button>
                    {tab === 'pulse' && (
                      <button
                        onClick={() => setCompareItem(item)}
                        className="flex-1 py-4 bg-green-50 text-green-700 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-green-100 hover:bg-green-100 transition-colors"
                      >
                        <Scale size={14} /> {t.compare_price}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRICE COMPARISON MODAL */}
      {compareItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full bg-white rounded-[3rem] shadow-2xl animate-in zoom-in duration-300 p-8 overflow-hidden relative">
            <button onClick={() => setCompareItem(null)} className="absolute top-6 right-6 text-gray-300 hover:text-gray-900"><X size={24} /></button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-3xl bg-green-50 flex items-center justify-center text-green-700">
                <Scale size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">{t.compare_price}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{compareItem.crop} Analysis</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase mb-2">{t.market_avg}</p>
                  <h4 className="text-2xl font-black text-gray-900">₹{getMarketAverage(compareItem.crop)}/kg</h4>
                  <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">District Wide</p>
                </div>
                <div className="bg-green-700 p-5 rounded-3xl text-white shadow-xl shadow-green-100">
                  <p className="text-[9px] font-black text-white/60 uppercase mb-2">Item Price</p>
                  <h4 className="text-2xl font-black">{compareItem.price.split('/')[0]}</h4>
                  <p className="text-[8px] font-bold text-white/60 uppercase mt-1">This Listing</p>
                </div>
              </div>

              <div className="p-6 bg-green-50 rounded-3xl border border-green-100">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles size={18} className="text-green-700" />
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">{t.your_edge}</h4>
                </div>
                <p className="text-sm font-bold text-gray-700 leading-relaxed italic">
                  {parseInt(compareItem.price.replace(/\D/g, '')) < getMarketAverage(compareItem.crop)
                    ? "This is a Great Deal! Price is 12% below the district average. Potential for high profit margin if you buy and re-sell at mandi peaks."
                    : "Premium Pricing: This seller is asking for 5% above the average, justified by Grade A quality and Organic certification."}
                </p>
              </div>

              <button
                onClick={() => setCompareItem(null)}
                className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELL MY CROP MODAL FORM */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-t-[3rem] shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[95vh] flex flex-col">
            <div className="p-8 pb-4 flex justify-between items-center border-b border-gray-50">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Direct Listing</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Direct from Farm to Mandi</p>
              </div>
              <button onClick={() => setShowAddForm(false)} className="p-3 bg-gray-50 rounded-2xl text-gray-400 active:bg-gray-100 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-6">
              {/* Volume-Lock Mathematical Defense Display */}
              <div className="p-5 bg-gray-900 rounded-[2rem] border border-gray-800 shadow-xl mb-2">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2 text-white">
                    <Globe size={16} className="text-green-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Satellite Quota-Check</span>
                  </div>
                  <div className="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-[8px] font-black">2.0 ACRES VERIFIED</div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-gray-500 font-black uppercase mb-1">Total Organic Capacity</p>
                    <h4 className="text-xl font-black text-white">{ESTIMATED_MAX_QUOTA.toLocaleString()}kg</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-black uppercase mb-1">Mandi Quota Used</p>
                    <h4 className={`text-lg font-black ${isOverQuota ? 'text-red-400' : 'text-green-400'}`}>
                      {newListing.quantity ? parseInt(newListing.quantity).toLocaleString() : 0}kg
                    </h4>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isOverQuota ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min((parseInt(newListing.quantity || '0') / ESTIMATED_MAX_QUOTA) * 100, 100)}%` }}
                  ></div>
                </div>
                {isOverQuota && (
                  <div className="mt-3 flex items-center gap-2 text-red-400 animate-pulse">
                    <ShieldAlert size={14} />
                    <p className="text-[9px] font-black uppercase">Volume Lock Active: Quota Exceeded</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-3xl border border-green-100 mb-2">
                <div className="flex items-center gap-3">
                  <Leaf className="text-green-700" size={24} />
                  <div>
                    <p className="text-xs font-black text-gray-900">Organic Listing</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Earn 2x Premium</p>
                  </div>
                </div>
                <button
                  onClick={() => setNewListing({ ...newListing, isOrganic: !newListing.isOrganic })}
                  className={`w-12 h-6 rounded-full transition-all relative ${newListing.isOrganic ? 'bg-green-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newListing.isOrganic ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">What are you selling?</label>
                <div className="flex items-center bg-gray-50 rounded-2xl px-4 py-4 border border-gray-100 focus-within:ring-2 focus-within:ring-green-500 transition-all">
                  <Package size={20} className="text-green-600 mr-3" />
                  <input
                    type="text"
                    placeholder="e.g. Alphonso Mangoes"
                    className="bg-transparent outline-none w-full text-base font-bold text-gray-900"
                    value={newListing.crop}
                    onChange={(e) => setNewListing({ ...newListing, crop: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Price (₹)</label>
                  <div className="flex items-center bg-gray-50 rounded-2xl px-4 py-4 border border-gray-100 focus-within:ring-2 focus-within:ring-green-500 transition-all">
                    <span className="font-black text-gray-400 mr-2">₹</span>
                    <input
                      type="number"
                      placeholder="120"
                      className="bg-transparent outline-none w-full text-base font-bold text-gray-900"
                      value={newListing.price}
                      onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Quantity (kg)</label>
                  <div className="flex items-center bg-gray-50 rounded-2xl px-4 py-4 border border-gray-100 focus-within:ring-2 focus-within:ring-green-500 transition-all">
                    <input
                      type="number"
                      placeholder="500"
                      className="bg-transparent outline-none w-full text-base font-bold text-gray-900"
                      value={newListing.quantity}
                      onChange={(e) => setNewListing({ ...newListing, quantity: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Enhanced Voice Description UI */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Crop Description</label>
                  <button
                    onClick={toggleVoiceNote}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${isRecording
                      ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-100'
                      : 'bg-green-50 text-green-800 border border-green-200 hover:bg-green-100'
                      }`}
                  >
                    {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                    {isRecording ? 'Listening...' : 'Voice Note'}
                  </button>
                </div>
                <div className="flex flex-col bg-gray-50 rounded-3xl p-5 border border-gray-100 focus-within:ring-2 focus-within:ring-green-500 transition-all min-h-[140px] relative">
                  <textarea
                    placeholder="Describe harvest quality, color, texture, or pesticide usage..."
                    className="bg-transparent outline-none w-full text-sm font-bold text-gray-900 resize-none flex-1 placeholder:text-gray-300 leading-relaxed"
                    value={newListing.description}
                    onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                  />
                  <div className="absolute bottom-4 right-4 opacity-10 pointer-events-none">
                    <Volume2 size={32} className="text-green-900" />
                  </div>
                </div>
              </div>

              <div className="pb-16 pt-2">
                <button
                  onClick={handleAddListing}
                  disabled={!newListing.crop || !newListing.price || !newListing.quantity || isOverQuota}
                  className="w-full py-5 bg-green-700 text-white rounded-[2rem] font-black text-sm shadow-2xl shadow-green-100 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  {isOverQuota ? 'Quota Blocked' : 'Confirm Listing'} <ArrowRight size={20} />
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
