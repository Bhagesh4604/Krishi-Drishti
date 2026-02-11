import axios from 'axios';
import { UserProfile, Listing, ChatMessage } from '../../types';

const API_BASE_URL = '/api';

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

export const weatherService = {
  getWeather: async (lat?: number, lng?: number) => {
    const params = { lat, lng };
    const response = await api.get('/weather/', { params });
    return response.data;
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

export const plotService = {
  getPlots: async () => {
    const response = await api.get('/plots/');
    return response.data;
  },
  createPlot: async (plot: { name: string, coordinates: { lat: number, lng: number }[], area: number, crop_type?: string }) => {
    const response = await api.post('/plots/', plot);
    return response.data;
  },
  analyzePlot: async (plotId: number) => {
    const response = await api.get(`/plots/${plotId}/analyze`);
    return response.data;
  },
  getCarbonAnalysis: async (plotId: number) => {
    const response = await api.get(`/plots/${plotId}/carbon`);
    return response.data;
  }
};

export const carbonService = {
  getProjects: async () => {
    const response = await api.get('/carbon/projects');
    return response.data;
  },
  enrollPlot: async (plotId: number, methodology: string) => {
    const response = await api.post('/carbon/enroll', { plot_id: plotId, methodology });
    return response.data;
  },
  uploadEvidence: async (projectId: number, data: { description: string, geo_lat: number, geo_lng: number }) => {
    const response = await api.post(`/carbon/${projectId}/evidence`, data);
    return response.data;
  },
  verifyProject: async (projectId: number) => {
    const response = await api.post(`/carbon/${projectId}/verify`);
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

export default api;
