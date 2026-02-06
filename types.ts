
export type Screen = 'auth' | 'profile' | 'home' | 'chat' | 'vision' | 'vision-result' | 'map' | 'market' | 'market-detail' | 'finance' | 'forecast' | 'live-audio' | 'carbon-vault' | 'scheme-setu' | 'crop-stress';

export type Language = 'en' | 'hi' | 'mr' | 'bn' | 'te' | 'ta' | 'pa' | 'kn';

export type VisionMode = 'diagnosis' | 'grading' | 'verify-qr';

export interface UserProfile {
  name: string;
  district: string;
  crops: string[];
  language?: Language;
  landSize?: number; // Acres
  trustScore?: number;
  category?: 'General' | 'OBC' | 'SC' | 'ST';
  farmingType?: 'Organic' | 'Conventional' | 'Mixed';
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
