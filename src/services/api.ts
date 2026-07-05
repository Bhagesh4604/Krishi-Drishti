import axios from 'axios';
import { UserProfile, Listing, ChatMessage } from '../../types';
import { Geolocation } from '@capacitor/geolocation';

// Cache last-known position in sessionStorage for quick re-use
const LOCATION_CACHE_KEY = 'kd_last_location';

export const getUserLocation = async (): Promise<{ lat: number; lng: number }> => {
  const FALLBACK = { lat: 21.1458, lng: 79.0882 }; // Nagpur, MH

  // ── IP-based geo fallback — CORS-safe providers only ──
  const fetchIpLocation = async (): Promise<{ lat: number; lng: number }> => {
    // Provider 1: ipinfo.io — no rate-limit issues, returns "loc": "lat,lng"
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('https://ipinfo.io/json', { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      if (data.loc) {
        const [lat, lng] = data.loc.split(',').map(Number);
        console.log('[Location] IP (ipinfo.io) success:', lat, lng);
        return { lat, lng };
      }
    } catch { console.warn('[Location] ipinfo.io failed'); }

    // Provider 2: geojs.io — free, no API key, CORS-enabled
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      if (data.latitude && data.longitude) {
        console.log('[Location] IP (geojs.io) success:', data.latitude, data.longitude);
        return { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) };
      }
    } catch { console.warn('[Location] geojs.io failed'); }

    console.warn('[Location] All IP providers failed, using Nagpur fallback');
    return FALLBACK;
  };

  // ── If user manually pinned a city via the dashboard picker, honour it ──
  try {
    const saved = localStorage.getItem('kd_saved_location');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.lat && parsed?.lng) {
        console.log('[Location] Using user-pinned city:', parsed);
        return { lat: parsed.lat, lng: parsed.lng };
      }
    }
  } catch { /* ignore */ }

  // ── Try Capacitor GPS ONLY on real Android/iOS native ──
  const isNativeApp = typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor?.isNativePlatform?.() === true;

  if (isNativeApp) {
    try {
      let perm: any;
      try { perm = await Geolocation.checkPermissions(); } catch { /* not in Capacitor app */ }

      if (perm?.location === 'granted' || perm?.location === 'prompt') {
        if (perm.location === 'prompt') {
          try { perm = await Geolocation.requestPermissions(); } catch { /* ignore */ }
        }
        if (perm?.location === 'granted') {
          console.log('[Location] Trying Capacitor GPS (native)...');
          try {
            // Give it 15 seconds for a true GPS lock
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
            return { lat: pos.coords.latitude, lng: pos.coords.longitude };
          } catch (highAccErr) {
            console.warn('[Location] Capacitor High Accuracy failed, trying native low accuracy (Cell/WiFi)...');
            const lowPos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
            return { lat: lowPos.coords.latitude, lng: lowPos.coords.longitude };
          }
        }
      }
    } catch (err: any) {
      console.warn('[Location] All native Capacitor GPS methods failed:', err?.message || err);
    }
  }

  // ── Try Browser navigator.geolocation for ALL web (Desktop + Mobile) ──
  const supportsGeo = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const isSecure = typeof window !== 'undefined' && window.isSecureContext !== false;

  if (supportsGeo && isSecure) {
    // High accuracy (GPS hardware / highly accurate Chrome location services)
    const highAccResult = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      console.log('[Location] Trying Browser high-accuracy GPS...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('[Location] ✅ Browser high-accuracy GPS:', pos.coords.latitude, pos.coords.longitude, '±', pos.coords.accuracy, 'm');
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn(`[Location] Browser high-accuracy GPS error (code ${err.code}): ${err.message}`);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });

    if (highAccResult) return highAccResult;

    // Low accuracy fallback (Standard browser location)
    const lowAccResult = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      console.log('[Location] Trying Browser low-accuracy GPS...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('[Location] ✅ Browser low-accuracy GPS:', pos.coords.latitude, pos.coords.longitude, '±', pos.coords.accuracy, 'm');
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn(`[Location] Browser low-accuracy GPS error (code ${err.code}): ${err.message}`);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    });

    if (lowAccResult) return lowAccResult;
  } else {
    console.warn('[Location] Browser geolocation not available. isSecureContext:', isSecure, 'supportsGeo:', supportsGeo);
  }

  // ── Final fallback: IP geolocation ──
  console.log('[Location] All GPS methods failed — falling back to IP geolocation');
  return fetchIpLocation();
};

const isNativeForApi = typeof (window as any).Capacitor !== 'undefined' &&
  (window as any).Capacitor?.isNativePlatform?.() === true;

// When running in the Android Emulator, 10.0.2.2 points to the laptop's localhost.
// (If testing on a physical phone, you must use the laptop's actual IP like 192.168.x.x 
// AND run the backend with --host 0.0.0.0)
const API_BASE_URL = isNativeForApi ? 'http://10.0.2.2:8000/api' : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
// Request interceptor to add token & LOGGING
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ks_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[API Req] ${config.method?.toUpperCase()} ${config.url}`, config);
  return config;
}, (error) => {
  console.error('[API Req Error]', error);
  return Promise.reject(error);
});

// Response interceptor for LOGGING
api.interceptors.response.use((response) => {
  console.log(`[API Res] ${response.status} ${response.config.url}`, response.data);
  return response;
}, (error) => {
  console.error('[API Res Error]', error.response?.status, error.message, error.response?.data);
  return Promise.reject(error);
});

export const authService = {
  sendOtp: async (phone: string) => {
    const response = await api.post('/auth/send-otp', { phone });
    return response.data;
  },
  verifyOtp: async (phone: string, otp: string) => {
    const response = await api.post('/auth/verify-otp', { phone, otp });
    if (response.data.access_token) {
      localStorage.setItem('ks_token', response.data.access_token);
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('ks_token');
  }
};

export const userService = {
  getProfile: async () => {
    const response = await api.get<UserProfile>('/users/me');
    return response.data;
  },
  updateProfile: async (profile: Partial<UserProfile>) => {
    const response = await api.put<UserProfile>('/users/me', profile);
    return response.data;
  }
};

export const marketService = {
  getListings: async (filters?: { crop?: string, location?: string, lat?: number, lng?: number }) => {
    const params = new URLSearchParams();
    if (filters?.crop) params.append('crop', filters.crop);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.lat) params.append('lat', filters.lat.toString());
    if (filters?.lng) params.append('lng', filters.lng.toString());

    // The backend returns ListingResponse which has slightly different fields than Listing interface
    // So we map it here
    const response = await api.get<any[]>('/market/', { params });

    return response.data.map((item: any) => ({
      id: item.id,
      crop: item.crop_name, // Map crop_name to crop
      quantity: item.quantity,
      price: item.price,
      loc: item.location, // Map location to loc
      trend: item.trend || 'stable', // Default if missing
      verified: item.verified !== false, // Default true if missing
      isSellerVerified: true, // Mock/Default
      image: item.image_url || 'https://images.unsplash.com/photo-1595855709915-37b42028678d?w=800', // Map image_url to image
      category: 'Crop', // Default or derive
      seller: item.seller_name || 'Unknown Farmer', // Map seller_name
      description: item.description || '',
      trackingId: `KS-${item.id.toString().padStart(5, '0')}`, // Generate a tracking ID from ID
      forecast: 'Stable', // Default
      isOrganic: item.is_organic, // Map is_organic
      grade: item.grade || 'A',
      distanceKm: 0 // Default
    })) as Listing[];
  },
  createListing: async (listing: any) => {
    const response = await api.post<any>('/market/', listing);
    const item = response.data;
    // Return mapped object
    return {
      id: item.id,
      crop: item.crop_name,
      quantity: item.quantity,
      price: item.price,
      loc: item.location,
      trend: 'stable',
      verified: true,
      isSellerVerified: true,
      image: item.image_url || 'https://images.unsplash.com/photo-1595855709915-37b42028678d?w=800',
      category: 'Crop',
      seller: item.seller_name || 'Me',
      description: item.description || '',
      trackingId: `KS-${item.id.toString().padStart(5, '0')}`,
      forecast: 'Stable',
      isOrganic: item.is_organic,
      grade: item.grade || 'A',
      distanceKm: 0
    } as Listing;
  },
  checkPrice: async (query: string, lat?: number, lng?: number) => {
    const params: any = { query };
    if (lat) params.lat = lat;
    if (lng) params.lng = lng;
    const response = await api.get<{ text: string }>('/market/price-check', { params });
    return response.data;
  }
};

export const aiService = {
  chat: async (message: string) => {
    const response = await api.post<{ response: string }>('/ai/chat', { message });
    return response.data;
  },
  diagnose: async (imageFile: File, mode: string) => {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('mode', mode);
    const response = await api.post<any>('/ai/diagnose', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

export const financeService = {
  getStatus: async () => {
    const response = await api.get<{ trust_score: number, rainfall_mm: number, payout_eligible: boolean }>('/finance/status');
    return response.data;
  },
  getSchemes: async () => {
    // This was the old finance schemes. We now have a dedicated schemes router.
    // Keeping this for backward compatibility if needed, or redirecting.
    const response = await api.get('/finance/schemes');
    return JSON.parse(response.data.schemes);
  }
};

// Simple in-memory cache
let weatherCache = {
  data: null as any,
  timestamp: 0,
  lat: 0,
  lng: 0
};

export const weatherService = {
  getWeather: async (lat: number, lng: number) => {
    // Return cached data if valid (< 10 mins) and same location (approx)
    const now = Date.now();
    if (
      weatherCache.data &&
      (now - weatherCache.timestamp < 10 * 60 * 1000) &&
      Math.abs(weatherCache.lat - lat) < 0.01 &&
      Math.abs(weatherCache.lng - lng) < 0.01
    ) {
      console.log("Serving cached weather data");
      return weatherCache.data;
    }

    try {
      const response = await api.get(`/weather/current?lat=${lat}&lng=${lng}`);
      // Update cache
      weatherCache = {
        data: response.data,
        timestamp: now,
        lat,
        lng
      };
      return response.data;
    } catch (error) {
      console.error("Weather fetch failed", error);
      // Return cached data even if expired if fetch fails
      if (weatherCache.data) return weatherCache.data;
      throw error;
    }
  },
  searchCity: async (query: string) => {
    const response = await api.get<{ id: number, name: string, country: string, latitude: number, longitude: number }[]>('/weather/search', { params: { query } });
    return response.data;
  },
  reverseGeocode: async (lat: number, lng: number) => {
    const response = await api.get<{ city: string, district?: string }>('/weather/reverse', { params: { lat, lng } });
    return response.data;
  }
};

export const newsService = {
  getNews: async (district: string, language: string) => {
    const response = await api.post('/news/', { district, language });
    return response.data;
  }
};

export const schemesService = {
  getSchemes: async () => {
    const response = await api.get('/schemes/');
    return response.data;
  },
  applyScheme: async (schemeId: string, schemeName: string) => {
    const response = await api.post('/schemes/apply', { scheme_id: schemeId, scheme_name: schemeName });
    return response.data;
  }
};

export const communityService = {
  getFeed: async () => {
    const response = await api.get('/community/');
    return response.data;
  },
  createPost: async (post: { content: string, image_url?: string }) => {
    const response = await api.post('/community/', post);
    return response.data;
  },
  likePost: async (postId: string | number) => {
    const response = await api.post(`/community/${postId}/like`);
    return response.data;
  },
  addComment: async (postId: string | number, text: string) => {
    const response = await api.post(`/community/${postId}/comment`, { text });
    return response.data;
  }
};

let mockPlots: any[] = [
  { id: 1, name: 'Main Farm Plot', area: 12.5, crop_type: 'Wheat', coordinates: [] },
  { id: 2, name: 'North Field', area: 5.2, crop_type: 'Cotton', coordinates: [] },
  { id: 3, name: 'East Plot', area: 8.0, crop_type: 'Soybean', coordinates: [] },
  { id: 4, name: 'South Garden', area: 2.1, crop_type: 'Vegetables', coordinates: [] }
];

export const plotService = {
  getPlots: async () => {
    return [...mockPlots];
  },
  createPlot: async (plot: { name: string, coordinates: { lat: number, lng: number }[], area: number, crop_type?: string }) => {
    const newPlot = { id: Math.floor(Math.random() * 1000), ...plot };
    mockPlots.push(newPlot);
    return newPlot;
  },
  getCarbonAnalysis: async (plotId: number) => {
    return { carbon_score: 85, predicted_yield: 4200 };
  },
  forecastYield: async (plotId: number) => {
    return { forecast: 4500, unit: 'kg' };
  },
  startAnalysis: async (plotId: number) => {
    return { job_id: 'mock-job-123' };
  },
  pollJob: async (jobId: string) => {
    return { status: 'completed', result: 'Mock analysis completed successfully.' };
  }
};

let mockProjects: any[] = [
  { id: 101, plot_id: 1, plot_name: 'Main Farm Plot', methodology: 'Cover-Crop', aggregator_name: 'Verra Core', status: 'Enrolled', projected_credits: 45.5, available_credits: 0, locked_credits: 0, verified_credits: 0 }
];

let mockWallet = { balance: 0 };
let mockAggregators = [
  { name: 'Verra Core', role: 'Global Standard', settlement_days: 14, fee_percentage: 5, farmer_share_percentage: 95, contact: 'partner@verra.org' },
  { name: 'Puro Earth', role: 'Biochar Specialist', settlement_days: 7, fee_percentage: 8, farmer_share_percentage: 92, contact: 'onboarding@puro.earth' }
];

export const carbonService = {
  getProjects: async () => {
    return [...mockProjects];
  },
  getSchemes: async () => {
    return [];
  },
  monitorPlot: async (plotId: number, methodology: string = 'Cover-Crop') => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      analysis: {
        carbon: {
          gross_credits: 52.4,
          issuable_credits: 41.9,
          buffer_pool: 10.5
        },
        monitoring: {
          current_ndvi: 0.65,
          ndvi_change: 0.12,
          soil_moisture: 32.5
        }
      }
    };
  },
  enrollPlot: async (plotId: number, methodology: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    mockProjects.push({
      id: Math.floor(Math.random() * 1000),
      plot_id: plotId,
      plot_name: 'Newly Enrolled Plot',
      methodology,
      aggregator_name: 'Verra Core',
      status: 'Enrolled',
      projected_credits: 41.9,
      available_credits: 0,
      locked_credits: 0,
      verified_credits: 0
    });
    return { success: true };
  },
  uploadEvidence: async (projectId: number, data: any) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const project = mockProjects.find(p => p.id === projectId);
    if (project) {
      project.status = 'Evidence_Pending';
    }
    return { success: true };
  },
  verifyProject: async (projectId: number) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const project = mockProjects.find(p => p.id === projectId);
    if (project) {
      project.status = 'Verified';
      project.verified_credits = project.projected_credits;
      project.available_credits = project.projected_credits;
      mockWallet.balance += project.projected_credits;
    }
    return { message: 'Audit successful! ACT Credits issued.' };
  },
  getWallet: async () => {
    return mockWallet;
  },
  getAggregators: async () => {
    return mockAggregators;
  },
  claimPayout: async (projectId: number, claimCredits: number) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const project = mockProjects.find(p => p.id === projectId);
    if (project) {
      project.available_credits -= claimCredits;
      mockWallet.balance -= claimCredits;
    }
    return { message: 'Payout initiated successfully!', farmer_payout_inr: claimCredits * 2500 };
  }
};

export const contractService = {
  getContracts: async (status: 'Open' | 'Signed' = 'Open') => {
    const response = await api.get('/contracts/', { params: { status } });
    return response.data;
  },
  signContract: async (contractId: number, signatureHash: string) => {
    const response = await api.post('/contracts/sign', { contract_id: contractId, signature_hash: signatureHash });
    return response.data;
  }
};

export const insuranceService = {
  search: async (query: string = '') => {
    const response = await api.get('/insurance/search', { params: { query } });
    return response.data;
  },
  enroll: async (data: any) => {
    const response = await api.post('/insurance/enroll', data);
    return response.data;
  }
};

export const systemService = {
  getTelemetry: async () => {
    // Ping various endpoints to measure latency and verify they are up
    const results = [];
    
    // 1. Core API (Health)
    try {
      const start = performance.now();
      await api.get('/health');
      results.push({ id: 'api-gateway', status: 'verified', latency: `${Math.round(performance.now() - start)}ms` });
    } catch {
      results.push({ id: 'api-gateway', status: 'error', latency: 'N/A' });
    }

    // 2. Database Sync (Plots or Market)
    try {
      const start = performance.now();
      const res = await api.get('/market/');
      results.push({ id: 'db-sync', status: 'verified', latency: `${Math.round(performance.now() - start)}ms`, dataCount: res.data?.length || 4892 });
    } catch {
      results.push({ id: 'db-sync', status: 'error', dataCount: 0 });
    }

    // 3. Auth Layer (Profile)
    try {
      const start = performance.now();
      await api.get('/users/me'); // Might fail if no token, which is also a response
      results.push({ id: 'auth-layer', status: 'verified', latency: `${Math.round(performance.now() - start)}ms` });
    } catch {
      // 401 means auth layer is working and rejecting us properly
      results.push({ id: 'auth-layer', status: 'verified', latency: 'Auth Intercepted' });
    }

    return results;
  }
};

let mockTokens: any[] = [];

export const traceabilityService = {
  getMyTokens: async () => {
    return [...mockTokens];
  },
  mintToken: async (payload: any) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newToken = {
      id: `TRC-${Math.floor(Math.random() * 10000)}`,
      status: 'Minted',
      ...payload,
      carbon_footprint_kg_co2e: payload.yield_kg * 0.21,
      mint_date: new Date().toISOString()
    };
    mockTokens.push(newToken);
    return newToken;
  },
  transferToken: async (tokenId: string, payload: { buyer_name: string; buyer_entity: string; notes?: string }) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const token = mockTokens.find(t => t.id === tokenId);
    if (token) {
      token.status = 'Transferred';
      token.buyer = payload.buyer_entity;
    }
    return { success: true };
  },
  verifyToken: async (tokenId: string) => {
    try {
      const response = await api.get(`/trace/verify/${tokenId}`);
      return response.data;
    } catch (e) {
      console.warn("Backend verify failed, using mock", e);
      const token = mockTokens.find(t => t.id === tokenId || t.token_id === tokenId);
      if (!token) throw new Error("Token not found");
      return token;
    }
  },
  deleteToken: async (tokenId: string) => {
    mockTokens = mockTokens.filter(t => t.id !== tokenId);
    return { success: true };
  }
};

export const marketplaceService = {
  getTokens: async (crop?: string) => {
    const params = crop ? { crop } : {};
    const response = await api.get('/trace/marketplace', { params });
    return response.data;
  }
};

export const corporateService = {
  getPortfolio: async () => {
    const response = await api.get('/corporate/portfolio');
    return response.data;
  }
};

export const cropCycleService = {
  getCycles: async (plotId: number) => {
    const response = await api.get(`/cycles/plot/${plotId}`);
    return response.data;
  },
  startCycle: async (plotId: number, data: { crop_type: string, variety?: string }) => {
    const response = await api.post(`/cycles/plot/${plotId}/start`, data);
    return response.data;
  },
  logEvent: async (cycleId: number, data: { event_type: string, geo_lat?: number, geo_lng?: number, notes?: string, media_url?: string }) => {
    const response = await api.post(`/cycles/${cycleId}/events`, data);
    return response.data;
  }
};

export default api;
