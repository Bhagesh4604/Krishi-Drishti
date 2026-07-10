export type Screen = 'landing' | 'auth' | 'home' | 'chat' | 'vision' | 'vision-result' | 'map' | 'market' | 'market-detail' | 'insurance' | 'forecast' | 'live-audio' | 'carbon-vault' | 'scheme-setu' | 'contracts' | 'crop-stress' | 'profile' | 'globe' | 'contracts' | 'landmark' | 'acoustic-scanner' | 'soil-carbon' | 'traceability' | 'trace-verify' | 'field-monitor' | 'crop-cycle' | 'marketplace' | 'corporate-dashboard' | 'smart-irrigation' | 'digital-twin';

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

export interface ChemicalInput {
  name: string;
  quantity: string;
  unit: string;
  applied_date: string;
}

export interface TokenTransferLog {
  from_entity: string;
  to_entity: string;
  transfer_date: string;
  transfer_hash: string;
  notes?: string;
}

export interface HarvestToken {
  token_id: string;
  crop_type: string;
  variety?: string;
  harvest_date: string;
  yield_kg: number;
  area_harvested_acres: number;
  carbon_footprint_kg_co2e: number;
  carbon_credits_linked: number;
  farming_methodology?: string;
  ndvi_at_harvest?: number;
  status: 'Draft' | 'Minted' | 'Transferred';
  token_hash?: string;
  previous_hash?: string;
  sequence_number: number;
  qr_url?: string;
  minted_at?: string;
  buyer_name?: string;
  buyer_entity?: string;
  transferred_at?: string;
  chemical_inputs: ChemicalInput[];
  transfer_logs: TokenTransferLog[];
  plot_name: string;
  farmer_initials: string;
  farmer_district: string;
  geo_lat?: number;
  geo_lng?: number;
  // Public verify fields
  hash_payload?: string;
  hash_algorithm?: string;
  cbam_eligible?: boolean;
  ccts_eligible?: boolean;
}
