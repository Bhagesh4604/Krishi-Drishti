import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, ShieldCheck, Leaf, Package,
  CheckCircle2, Loader2, X, ExternalLink, Plus,
  TrendingUp, AlertCircle, ChevronDown, ChevronUp,
  Download, RefreshCw,
} from 'lucide-react';
import { Screen } from '../types';
import { marketplaceService } from '../src/services/api';

interface Props {
  navigateTo: (screen: Screen, data?: any) => void;
  t?: any;
  user?: any;
}

// ── Methodology display helpers ───────────────────────────────────────────────
const METHODOLOGY_COLORS: Record<string, string> = {
  'No-Till': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Organic Inputs': 'bg-green-100 text-green-800 border-green-200',
  'Drip Irrigation': 'bg-blue-100 text-blue-800 border-blue-200',
  'Agroforestry': 'bg-lime-100 text-lime-800 border-lime-200',
  'Cover Crops': 'bg-teal-100 text-teal-800 border-teal-200',
  'Biochar': 'bg-amber-100 text-amber-800 border-amber-200',
  'Precision Farming': 'bg-purple-100 text-purple-800 border-purple-200',
};
const methodologyColor = (m?: string) =>
  METHODOLOGY_COLORS[m || ''] || 'bg-gray-100 text-gray-700 border-gray-200';

// ── Buy Modal ─────────────────────────────────────────────────────────────────
const BuyModal: React.FC<{
  listing: any;
  onClose: () => void;
  onSuccess: (cert: any) => void;
}> = ({ listing, onClose, onSuccess }) => {
  const [step, setStep] = useState<'form' | 'paying' | 'done' | 'error'>('form');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerEntity, setBuyerEntity] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [cert, setCert] = useState<any>(null);

  const handleBuy = async () => {
    if (!buyerName.trim() || !buyerEmail.trim()) {
      setErrMsg('Name and email are required.');
      return;
    }
    setErrMsg('');
    setStep('paying');

    try {
      // Step 1: Initiate purchase — gets Razorpay order or demo order
      const order = await marketplaceService.initiatePurchase({
        listing_id: listing.id,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_entity: buyerEntity || undefined,
      });

      if (order._demo) {
        // Demo mode (no real Razorpay keys) — simulate instant payment capture
        const verification = await marketplaceService.verifyPayment({
          razorpay_order_id: order.razorpay_order_id,
          razorpay_payment_id: `pay_DEMO_${Date.now()}`,
          razorpay_signature: 'DEMO_SIGNATURE',
          purchase_id: order.purchase_id,
        });
        setCert(verification);
        setStep('done');
        onSuccess(verification);
      } else {
        // Real Razorpay checkout
        const Razorpay = (window as any).Razorpay;
        if (!Razorpay) {
          setErrMsg('Razorpay SDK not loaded. Please refresh the page.');
          setStep('error');
          return;
        }
        const rzp = new Razorpay({
          key: order.razorpay_key_id,
          amount: order.amount_paise,
          currency: 'INR',
          name: 'Krishi-Drishti Carbon Marketplace',
          description: order.description,
          order_id: order.razorpay_order_id,
          prefill: order.prefill,
          handler: async (response: any) => {
            try {
              const verification = await marketplaceService.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                purchase_id: order.purchase_id,
              });
              setCert(verification);
              setStep('done');
              onSuccess(verification);
            } catch {
              setErrMsg('Payment captured but verification failed. Contact support.');
              setStep('error');
            }
          },
          modal: { ondismiss: () => setStep('form') },
        });
        rzp.open();
      }
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail || 'Purchase failed. Please try again.');
      setStep('error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-500 p-5 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest">Purchase Carbon Credits</p>
              <h3 className="text-xl font-black mt-0.5">{listing.quantity_tco2e.toFixed(2)} ACT</h3>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm font-medium">
            <span>₹{listing.price_per_tco2e_inr.toLocaleString()}/tCO₂e</span>
            <span>·</span>
            <span className="font-black">Total: ₹{listing.total_inr.toLocaleString()}</span>
          </div>
        </div>

        <div className="p-5">
          {step === 'form' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <strong>Demo Mode:</strong> No real payment is processed. Credits are simulated.
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Name *</label>
                <input
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  placeholder="Full name or organisation"
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email *</label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={e => setBuyerEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Organisation (optional)</label>
                <input
                  value={buyerEntity}
                  onChange={e => setBuyerEntity(e.target.value)}
                  placeholder="Company name"
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {errMsg && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle size={14} /> {errMsg}
                </div>
              )}
              <button
                onClick={handleBuy}
                className="w-full py-4 rounded-xl bg-emerald-600 text-white font-black text-base hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/30"
              >
                Purchase {listing.quantity_tco2e.toFixed(2)} ACT — ₹{listing.total_inr.toLocaleString()}
              </button>
              <p className="text-center text-[10px] text-gray-400">
                20% platform fee included · Farmer receives ₹{(listing.total_inr * 0.8).toLocaleString()}
              </p>
            </div>
          )}

          {step === 'paying' && (
            <div className="py-12 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-emerald-600" size={40} />
              <p className="font-bold text-gray-700">Processing payment…</p>
              <p className="text-sm text-gray-400">Please wait</p>
            </div>
          )}

          {step === 'done' && cert && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h4 className="font-black text-gray-900 text-lg">Credits Purchased!</h4>
              <p className="text-sm text-gray-500">Your retirement certificate has been issued.</p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 w-full text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Certificate ID</span>
                  <span className="text-xs font-mono font-bold text-gray-900">{cert.certificate_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Farmer Payout</span>
                  <span className="text-xs font-bold text-emerald-700">₹{cert.farmer_payout_inr?.toLocaleString()}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-[10px] text-gray-400 font-mono break-all">{cert.certificate_hash?.substring(0, 32)}…</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <AlertCircle size={40} className="text-red-500" />
              <p className="font-bold text-gray-900">Purchase Failed</p>
              <p className="text-sm text-gray-500">{errMsg}</p>
              <button onClick={() => setStep('form')} className="px-6 py-3 rounded-xl bg-gray-900 text-white font-bold">
                Try Again
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const MarketplaceScreen: React.FC<Props> = ({ navigateTo, user }) => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [recentCert, setRecentCert] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'buy' | 'mylistings'>('buy');
  const [myListings, setMyListings] = useState<any[]>([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);

  useEffect(() => { fetchListings(); }, []);
  useEffect(() => {
    if (activeTab === 'mylistings') fetchMyListings();
  }, [activeTab]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await marketplaceService.getListings(
        filterMethod ? { methodology: filterMethod } : undefined
      );
      setListings(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load marketplace listings. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    if (!user) return;
    try {
      setMyListingsLoading(true);
      const data = await marketplaceService.getMyListings();
      setMyListings(Array.isArray(data) ? data : []);
    } catch {
      setMyListings([]);
    } finally {
      setMyListingsLoading(false);
    }
  };

  const filteredListings = listings.filter(l => {
    const q = searchQ.toLowerCase();
    return !q ||
      (l.methodology && l.methodology.toLowerCase().includes(q)) ||
      (l.description && l.description.toLowerCase().includes(q)) ||
      String(l.vintage_year).includes(q);
  });

  const allMethodologies = [...new Set(listings.map(l => l.methodology).filter(Boolean))];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white px-4 pt-5 pb-3 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigateTo('home')} className="p-2 rounded-full hover:bg-gray-100 text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Carbon Credit Exchange</p>
            <h1 className="text-gray-900 text-xl font-black">ACT Marketplace</h1>
          </div>
          <button onClick={fetchListings} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-3">
          {(['buy', 'mylistings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              {tab === 'buy' ? '🌿 Browse Credits' : '📋 My Listings'}
            </button>
          ))}
        </div>

        {activeTab === 'buy' && (
          <>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 border border-gray-200 mb-2">
              <Search size={16} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search methodology, vintage year…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-500 outline-none"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900"
            >
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showFilters ? 'Hide Filters' : 'Filter by Methodology'}
            </button>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={() => setFilterMethod('')}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                        !filterMethod ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300'
                      }`}
                    >
                      All
                    </button>
                    {allMethodologies.map(m => (
                      <button
                        key={m}
                        onClick={() => setFilterMethod(filterMethod === m ? '' : m)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                          filterMethod === m ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ── Recent Certificate Banner ─────────────────────────────────────── */}
      <AnimatePresence>
        {recentCert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-3"
          >
            <CheckCircle2 size={18} />
            <div className="flex-1">
              <p className="text-xs font-black">Purchase Successful!</p>
              <p className="text-[10px] opacity-90">Certificate: {recentCert.certificate_id}</p>
            </div>
            <button onClick={() => setRecentCert(null)}><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* ── Browse Tab ── */}
        {activeTab === 'buy' && (
          <>
            {/* Stats row */}
            {!loading && listings.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-lg font-black text-emerald-700">{listings.length}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase">Active Listings</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-lg font-black text-emerald-700">
                    {listings.reduce((s, l) => s + l.quantity_tco2e, 0).toFixed(0)}
                  </p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase">Total tCO₂e</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-lg font-black text-emerald-700">
                    ₹{Math.round(listings.reduce((s, l) => s + l.price_per_tco2e_inr, 0) / listings.length).toLocaleString()}
                  </p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase">Avg Price/ACT</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center py-16 gap-4">
                <Loader2 className="animate-spin text-emerald-600" size={36} />
                <p className="text-gray-500 text-sm font-medium">Loading marketplace…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center py-12 gap-4 text-center px-4">
                <AlertCircle size={40} className="text-red-400" />
                <p className="text-red-600 font-bold">Connection Error</p>
                <p className="text-gray-500 text-sm">{error}</p>
                <button onClick={fetchListings} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700">
                  Retry
                </button>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-4 text-center">
                <Package size={48} className="text-gray-200" />
                <p className="text-gray-500 font-bold">No listings available</p>
                <p className="text-gray-400 text-sm">Farmers with verified carbon projects can list credits here.</p>
              </div>
            ) : (
              filteredListings.map(listing => (
                <motion.div
                  key={listing.id}
                  whileHover={{ scale: 1.01 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${methodologyColor(listing.methodology)}`}>
                            {listing.methodology || 'Carbon Credit'}
                          </span>
                          {listing.vintage_year && (
                            <span className="text-[10px] text-gray-400 font-bold">Vintage {listing.vintage_year}</span>
                          )}
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">
                          {listing.quantity_tco2e.toFixed(2)}
                          <span className="text-base font-bold text-emerald-600 ml-1.5">ACT</span>
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-gray-900">
                          ₹{listing.price_per_tco2e_inr.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-400">per tCO₂e</p>
                      </div>
                    </div>

                    {listing.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{listing.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                        <Leaf size={13} />
                        <span>Total: ₹{listing.total_inr.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Verified</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedListing(listing)}
                    className="w-full py-3.5 bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <TrendingUp size={16} />
                    Buy {listing.quantity_tco2e.toFixed(2)} ACT — ₹{listing.total_inr.toLocaleString()}
                  </button>
                </motion.div>
              ))
            )}
          </>
        )}

        {/* ── My Listings Tab ── */}
        {activeTab === 'mylistings' && (
          <>
            {!user && (
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-500 font-bold">Please log in to view your listings.</p>
              </div>
            )}
            {user && myListingsLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
              </div>
            )}
            {user && !myListingsLoading && myListings.length === 0 && (
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-600 font-bold">No listings yet</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">
                  Claim your verified carbon credits in the Carbon Vault, then list them here.
                </p>
                <button
                  onClick={() => navigateTo('carbonVault')}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold"
                >
                  Go to Carbon Vault
                </button>
              </div>
            )}
            {user && !myListingsLoading && myListings.map(l => (
              <div key={l.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${methodologyColor(l.methodology)}`}>
                      {l.methodology || 'Carbon Credit'}
                    </span>
                    <p className="text-xl font-black text-gray-900 mt-2">
                      {l.quantity_tco2e.toFixed(2)} ACT
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">₹{l.price_per_tco2e_inr.toLocaleString()}/ACT</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      l.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      l.status === 'sold' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {l.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Listed {new Date(l.created_at).toLocaleDateString()} · Total ₹{l.total_inr.toLocaleString()}
                </p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Buy Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedListing && (
          <BuyModal
            listing={selectedListing}
            onClose={() => setSelectedListing(null)}
            onSuccess={(cert) => {
              setRecentCert(cert);
              setSelectedListing(null);
              fetchListings(); // refresh listings after purchase
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketplaceScreen;
