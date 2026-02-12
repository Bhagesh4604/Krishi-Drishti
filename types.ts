
export type Screen = 'landing' | 'auth' | 'home' | 'chat' | 'vision' | 'vision-result' | 'map' | 'market' | 'market-detail' | 'insurance' | 'forecast' | 'live-audio' | 'carbon-vault' | 'scheme-setu' | 'contracts' | 'crop-stress' | 'profile' | 'globe' | 'contracts';

export type Language = 'en' | 'hi' | 'mr' | 'bn' | 'te' | 'ta' | 'pa' | 'kn';

export type VisionMode = 'diagnosis' | 'grading' | 'verify-qr';

export interface UserProfile {
  name: string;
  district: string;
  crops?: string | string[];
  language?: Language;
  land_size?: number; // Acres
  trust_score?: number;
  category?: 'General' | 'OBC' | 'SC' | 'ST';
  farming_type?: 'Organic' | 'Conventional' | 'Mixed';
  location?: { lat: number; lng: number };
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  isIntervention?: boolean;
  interventionType?: 'debt_relief' | 'helpline';
}

export interface Scheme {
  id: string;
  name: string;
  department: string;
  matchScore: number;
  benefits: string;
  requirements: string[];
  description: string;
  link: string;
}

export interface Post {
  id: string;
  author: string;
  avatar: string;
  timestamp: string;
  type: 'image' | 'video';
  image?: string;
  videoUrl?: string;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  caption: string;
  tags?: string[];
}

export interface Listing {
  id: number;
  crop: string;
  quantity: string;
  price: string;
  loc: string;
  trend: string;
  verified: boolean;
  isSellerVerified: boolean;
  image: string;
  category: string;
  seller: string;
  description: string;
  trackingId: string;
  forecast: string;
  isOrganic: boolean;
  maxQuota?: number;
  isConsumed?: boolean;
  isFraud?: boolean;
  grade?: 'A' | 'B' | 'C';
  distanceKm?: number;
}
