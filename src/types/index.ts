import { Request } from 'express';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  created_at: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  role?: 'user' | 'admin';
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export interface RefreshToken {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: UserResponse;
}

export interface EarningsItem {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: 'bmo' | 'amc' | 'dmh';
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

export interface EarningsResponse {
  earningsCalendar: EarningsItem[];
}

export interface EnrichedEarningsItem extends EarningsItem {
  epsBeatMissPercent: string | null;
  revenueBeatMissPercent: string | null;
  epsResult: 'beat' | 'miss' | null;
  revenueResult: 'beat' | 'miss' | null;
}

export interface Stock {
  id: number;
  symbol: string;
  name: string;
  sector?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  timestamp: Date;
}

export interface WatchlistItem {
  id: number;
  user_id: number;
  symbol: string;
  added_at: Date;
  notes?: string;
}

export interface WatchlistResponse {
  id: number;
  symbol: string;
  notes?: string;
  added_at: Date;
  stock?: Stock;
  quote?: StockQuote;
}

export interface Conversation {
  id: number;
  user_id: number;
  message: string;
  response: string;
  sources?: any[];
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface ConversationResponse {
  id: number;
  message: string;
  response: string;
  created_at: Date;
}

export interface UserProfile {
  id: number;
  user_id: number;
  role: 'user' | 'admin';
  preferences: Record<string, any>;
  portfolio: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ApiUsageLog {
  id: number;
  user_id: number;
  endpoint: string;
  parameters?: Record<string, any>;
  response_time?: number;
  status_code?: number;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}

export interface EarningsAlert {
  id: number;
  user_id: number;
  symbol: string;
  alert_before_days: number;
  is_active: boolean;
  created_at: Date;
}

export interface EarningsAlertResponse {
  id: number;
  symbol: string;
  alert_before_days: number;
  is_active: boolean;
  created_at: Date;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  details?: any;
}

export interface SuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
}