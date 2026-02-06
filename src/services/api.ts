import axios from 'axios';
import { UserProfile, Listing, ChatMessage } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ks_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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
  getListings: async (filters?: { crop?: string, location?: string }) => {
    const params = new URLSearchParams();
    if (filters?.crop) params.append('crop', filters.crop);
    if (filters?.location) params.append('location', filters.location);
    const response = await api.get<Listing[]>('/market/', { params });
    return response.data;
  },
  createListing: async (listing: any) => {
    const response = await api.post<Listing>('/market/', listing);
    return response.data;
  },
  checkPrice: async (query: string) => {
    const response = await api.get<{ text: string }>('/market/price-check', { params: { query } });
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
    const response = await api.post<{ analysis: string }>('/ai/diagnose', formData, {
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
    const response = await api.get<{ schemes: string }>('/finance/schemes');
    return JSON.parse(response.data.schemes);
  }
};

export default api;
