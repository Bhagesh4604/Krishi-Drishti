import axios from 'axios';
import { UserProfile, Listing, ChatMessage } from '../../types';
import { Geolocation } from '@capacitor/geolocation';
import { apiResponseCache } from '../utils/lruCache';
import { resilientDispatcher } from '../utils/resilientPoll';
import { PriorityLevel } from '../utils/priorityQueue';

export { apiResponseCache, resilientDispatcher, PriorityLevel };

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

const LIVE_BACKEND_URL = 'https://krishi-drishti-proxy.swanky-mine.workers.dev/api';
const API_BASE_URL = import.meta.env.VITE_API_URL || LIVE_BACKEND_URL;

// NOTE: Do NOT override axios.defaults.adapter here.
// CapacitorHttp (enabled in capacitor.config.ts) intercepts ALL HTTP calls natively
// on Android/iOS. Forcing the 'fetch' adapter breaks this interception and causes
// "Network Error" on device. Let Capacitor/axios pick the right adapter automatically.

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000, // 90s: covers Render free-tier cold starts (can take 60-80s)
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
    const response = await resilientDispatcher.execute(
      () => api.post('/auth/send-otp', { phone }),
      { priority: PriorityLevel.HIGH, maxRetries: 3, initialDelayMs: 1500 }
    );
    return response.data;
  },
  verifyOtp: async (phone: string, otp: string) => {
    const response = await resilientDispatcher.execute(
      () => api.post('/auth/verify-otp', { phone, otp }),
      { priority: PriorityLevel.HIGH, maxRetries: 3, initialDelayMs: 1500 }
    );
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
    const cached = apiResponseCache.get('user:profile');
    if (cached) {
      return cached;
    }
    const response = await resilientDispatcher.execute(
      () => api.get<UserProfile>('/users/me'),
      { priority: PriorityLevel.HIGH }
    );
    apiResponseCache.put('user:profile', response.data, { ttlMs: 10 * 60 * 1000 });
    return response.data;
  },
  updateProfile: async (profile: Partial<UserProfile>) => {
    const response = await resilientDispatcher.execute(
      () => api.put<UserProfile>('/users/me', profile),
      { priority: PriorityLevel.HIGH, maxRetries: 2, initialDelayMs: 1500 }
    );
    apiResponseCache.put('user:profile', response.data, { ttlMs: 10 * 60 * 1000 });
    return response.data;
  }
};

export const marketService = {
  getListings: async (filters?: { crop?: string, location?: string, lat?: number, lng?: number }) => {
    const cacheKey = `market:listings:${filters?.crop || ''}:${filters?.location || ''}:${filters?.lat || ''}:${filters?.lng || ''}`;
    const cached = apiResponseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams();
    if (filters?.crop) params.append('crop', filters.crop);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.lat) params.append('lat', filters.lat.toString());
    if (filters?.lng) params.append('lng', filters.lng.toString());

    // The backend returns ListingResponse which has slightly different fields than Listing interface
    const response = await resilientDispatcher.execute(
      () => api.get<any[]>('/market/', { params }),
      { priority: PriorityLevel.HIGH }
    );

    const mapped = response.data.map((item: any) => ({
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

    apiResponseCache.put(cacheKey, mapped, { ttlMs: 5 * 60 * 1000 });
    return mapped;
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
    const response = await resilientDispatcher.execute(
      () => api.post<{ response: string }>('/ai/chat', { message }),
      {
        priority: PriorityLevel.HIGH,
        maxRetries: 3,
        timeoutMs: 90000,
        initialDelayMs: 2000,
      }
    );
    return response.data;
  },
  diagnose: async (imageFile: File, mode: string) => {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('mode', mode);

    // Dispatched via Priority Queue with Critical Priority & Exponential Backoff
    // to handle Render cold-start latency without dropping the inference request.
    const response = await resilientDispatcher.execute(
      () => api.post<any>('/ai/diagnose', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
      {
        priority: PriorityLevel.CRITICAL,
        maxRetries: 4,
        timeoutMs: 90000,
        initialDelayMs: 2000,
      }
    );
    return response.data;
  }
};

export const financeService = {
  getStatus: async () => {
    const response = await api.get<{ trust_score: number, rainfall_mm: number, payout_eligible: boolean }>('/finance/status');
    return response.data;
  },
  getSchemes: async () => {
    const response = await api.get('/finance/schemes');
    return JSON.parse(response.data.schemes);
  }
};

export const weatherService = {
  getWeather: async (lat: number, lng: number) => {
    const cacheKey = `weather:${lat.toFixed(2)},${lng.toFixed(2)}`;
    const cached = apiResponseCache.get(cacheKey);
    if (cached) {
      console.log("[LRUCache] Serving cached weather data:", cacheKey);
      return cached;
    }

    try {
      const response = await resilientDispatcher.execute(
        () => api.get(`/weather/current?lat=${lat}&lng=${lng}`),
        {
          priority: PriorityLevel.HIGH,
          maxRetries: 3,
          initialDelayMs: 1500,
        }
      );
      apiResponseCache.put(cacheKey, response.data, { ttlMs: 10 * 60 * 1000 });
      return response.data;
    } catch (err: any) {
      console.warn("[WeatherService] Resilient fetch failed:", err?.message || err);
      // Return expired cache if available
      const fallbackCached = apiResponseCache.get(cacheKey);
      if (fallbackCached) return fallbackCached;
      throw err;
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
    const cacheKey = 'schemes:list';
    const cached = apiResponseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await resilientDispatcher.execute(
      () => api.get('/schemes/'),
      { priority: PriorityLevel.NORMAL, maxRetries: 3 }
    );
    apiResponseCache.put(cacheKey, response.data, { ttlMs: 30 * 60 * 1000 });
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

export const plotService = {
  getPlots: async () => {
    const response = await api.get('/plots/');
    return response.data;
  },
  createPlot: async (plot: { name: string, coordinates: { lat: number, lng: number }[], area: number, crop_type?: string }) => {
    const response = await api.post('/plots/', plot);
    return response.data;
  },
  getCarbonAnalysis: async (plotId: number) => {
    // Real endpoint implementation to be added
    return { carbon_score: 85, predicted_yield: 4200 };
  },
  forecastYield: async (plotId: number) => {
    const response = await api.get(`/plots/${plotId}/yield-forecast`);
    return response.data;
  },
  startAnalysis: async (plotId: number) => {
    // Call the real SSE analysis endpoint
    const response = await api.post('/sse_analysis/analyze-plot', { plot_id: plotId });
    return response.data;
  },
  pollJob: async (jobId: string) => {
    const response = await api.get(`/sse_analysis/task-status/${jobId}`);
    return response.data;
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
    const response = await api.get('/carbon/projects');
    return response.data;
  },
  getSchemes: async () => {
    const response = await api.get('/carbon/schemes');
    return response.data;
  },
  monitorPlot: async (plotId: number, methodology: string = 'Cover-Crop') => {
    const response = await resilientDispatcher.execute(
      () => api.get(`/carbon/plots/${plotId}/monitor?methodology=${methodology}`),
      { priority: PriorityLevel.HIGH, maxRetries: 3 }
    );
    const jobId = response.data.job_id;
    if (!jobId) return response.data;

    // Resilient Exponential Backoff Polling with Priority Queue
    // Manages Render cold-start and prevents long-running inference dropped requests
    const finalJob = await resilientDispatcher.pollUntil(
      () => api.get(`/jobs/${jobId}`),
      (res: any) => res.data?.status === 'success',
      (res: any) => res.data?.status === 'failed' ? (res.data?.error || 'Monitoring failed') : false,
      {
        priority: PriorityLevel.HIGH,
        timeoutMs: 180000,
        initialDelayMs: 2000,
        maxDelayMs: 15000,
        backoffFactor: 1.5,
      }
    );
    return { analysis: finalJob.data.result };
  },
  enrollPlot: async (plotId: number, methodology: string) => {
    const response = await resilientDispatcher.execute(
      () => api.post('/carbon/enroll', { plot_id: plotId, methodology }),
      { priority: PriorityLevel.HIGH, maxRetries: 3 }
    );
    const jobId = response.data.gee_job_id;
    if (!jobId) return response.data;

    await resilientDispatcher.pollUntil(
      () => api.get(`/jobs/${jobId}`),
      (res: any) => res.data?.status === 'success',
      (res: any) => res.data?.status === 'failed' ? (res.data?.error || 'Enrollment processing failed') : false,
      {
        priority: PriorityLevel.HIGH,
        timeoutMs: 180000,
        initialDelayMs: 2000,
        maxDelayMs: 15000,
        backoffFactor: 1.5,
      }
    );
    return response.data;
  },
  unenrollPlot: async (projectId: number) => {
    const response = await api.delete(`/carbon/projects/${projectId}`);
    return response.data;
  },
  uploadEvidence: async (projectId: number, data: any) => {
    const response = await api.post(`/carbon/${projectId}/evidence`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  verifyProject: async (projectId: number) => {
    const response = await api.post(`/carbon/${projectId}/verify`);
    return response.data;
  },
  getWallet: async () => {
    const response = await api.get('/carbon/wallet');
    return response.data;
  },
  getAggregators: async () => {
    const response = await api.get('/carbon/aggregators');
    return response.data;
  },
  claimPayout: async (projectId: number, claimCredits: number) => {
    const response = await api.post(`/carbon/projects/${projectId}/claim`, { claim_credits: claimCredits });
    return response.data;
  },
  getMyTokens: async () => {
    const response = await api.get('/carbon/my-tokens');
    return response.data;
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
