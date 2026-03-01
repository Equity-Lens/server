// server/src/services/calendarService.ts
import axios, { AxiosError } from 'axios';
import pool from '../config/database';
import { EarningsResponse, EarningsItem, EnrichedEarningsItem } from '../types';
import { AppError } from '../middleware/errorHandler';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Cache configuration
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, { data: EarningsResponse; timestamp: number }>();

interface FetchEarningsParams {
  from: string;
  to: string;
  symbol?: string;
  international?: boolean;
  userId?: string;
}

function getCacheKey(params: Record<string, any>): string {
  return JSON.stringify(params);
}

function getCachedData(key: string): EarningsResponse | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: EarningsResponse): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

function enrichEarningsData(items: EarningsItem[]): EnrichedEarningsItem[] {
  return items.map(item => ({
    ...item,
    epsBeatMissPercent: item.epsActual && item.epsEstimate 
      ? ((item.epsActual - item.epsEstimate) / item.epsEstimate * 100).toFixed(2)
      : null,
    revenueBeatMissPercent: item.revenueActual && item.revenueEstimate
      ? ((item.revenueActual - item.revenueEstimate) / item.revenueEstimate * 100).toFixed(2)
      : null,
    epsResult: item.epsActual && item.epsEstimate
      ? (item.epsActual >= item.epsEstimate ? 'beat' : 'miss')
      : null,
    revenueResult: item.revenueActual && item.revenueEstimate
      ? (item.revenueActual >= item.revenueEstimate ? 'beat' : 'miss')
      : null
  }));
}

async function logApiUsage(
  userId: string | undefined,
  endpoint: string,
  parameters: Record<string, any>
): Promise<void> {
  if (!userId) return;

  try {
    const query = `
      INSERT INTO api_usage_logs (user_id, endpoint, parameters, timestamp)
      VALUES ($1, $2, $3, NOW())
    `;
    await pool.query(query, [userId, endpoint, JSON.stringify(parameters)]);
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}

export async function fetchEarningsCalendar(
  params: FetchEarningsParams
): Promise<EarningsResponse> {
  const { from, to, symbol, international, userId } = params;

  // Check cache
  const cacheKey = getCacheKey({ from, to, symbol, international });
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    console.log(' Returning cached earnings data');
    return cachedData;
  }

  try {
    // Build API request
    const apiParams = new URLSearchParams({
      from,
      to,
      token: FINNHUB_API_KEY || ''
    });

    if (symbol) {
      apiParams.append('symbol', symbol.toUpperCase());
    }

    if (international) {
      apiParams.append('international', 'true');
    }

    console.log(` Fetching earnings calendar: ${from} to ${to}${symbol ? ` for ${symbol}` : ''}`);
    
    // Make API request
    const response = await axios.get<EarningsResponse>(
      `${FINNHUB_BASE_URL}/calendar/earnings?${apiParams.toString()}`,
      {
        timeout: 10000,
        headers: {
          'X-Finnhub-Token': FINNHUB_API_KEY
        }
      }
    );

    const earningsData = response.data;

    // Enrich data with calculations
    if (earningsData.earningsCalendar) {
      earningsData.earningsCalendar = enrichEarningsData(
        earningsData.earningsCalendar
      ) as any;
    }

    // Cache the response
    setCachedData(cacheKey, earningsData);

    // Log API usage
    await logApiUsage(userId, '/calendar/earnings', { from, to, symbol, international });

    console.log(` Fetched ${earningsData.earningsCalendar?.length || 0} earnings records`);

    return earningsData;
  } catch (error) {
    const axiosError = error as AxiosError;

    if (axiosError.response?.status === 401) {
      throw new AppError('Invalid Finnhub API key', 500);
    }

    if (axiosError.response?.status === 429) {
      throw new AppError('API rate limit exceeded. Please try again later.', 429);
    }

    if (axiosError.code === 'ECONNABORTED') {
      throw new AppError('Request timeout. Please try again.', 504);
    }

    console.error(' Finnhub API error:', axiosError.message);
    throw new AppError('Failed to fetch earnings calendar data', 500);
  }
}

export async function fetchEarningsForSymbol(
  symbol: string,
  limit: number = 10
): Promise<EarningsItem[]> {
  // Calculate date range (last 2 years)
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const cacheKey = getCacheKey({ symbol, from, to, type: 'symbol' });
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    console.log(` Returning cached data for ${symbol}`);
    return cachedData.earningsCalendar?.slice(0, limit) || [];
  }

  try {
    const params = new URLSearchParams({
      from,
      to,
      symbol: symbol.toUpperCase(),
      token: FINNHUB_API_KEY || ''
    });

    console.log(` Fetching earnings history for ${symbol}`);

    const response = await axios.get<EarningsResponse>(
      `${FINNHUB_BASE_URL}/calendar/earnings?${params.toString()}`,
      {
        timeout: 10000,
        headers: {
          'X-Finnhub-Token': FINNHUB_API_KEY
        }
      }
    );

    setCachedData(cacheKey, response.data);

    console.log(` Fetched ${response.data.earningsCalendar?.length || 0} records for ${symbol}`);

    return response.data.earningsCalendar?.slice(0, limit) || [];
  } catch (error) {
    console.error(` Failed to fetch earnings for ${symbol}:`, error);
    throw new AppError(`Failed to fetch earnings history for ${symbol}`, 500);
  }
}

export async function fetchUpcomingEarnings(): Promise<EarningsResponse> {
  const from = new Date().toISOString().split('T')[0];
  const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const cacheKey = getCacheKey({ from, to, type: 'upcoming' });
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    console.log(' Returning cached upcoming earnings');
    return cachedData;
  }

  try {
    const params = new URLSearchParams({
      from,
      to,
      token: FINNHUB_API_KEY || ''
    });

    console.log(` Fetching upcoming earnings: ${from} to ${to}`);

    const response = await axios.get<EarningsResponse>(
      `${FINNHUB_BASE_URL}/calendar/earnings?${params.toString()}`,
      {
        timeout: 10000,
        headers: {
          'X-Finnhub-Token': FINNHUB_API_KEY
        }
      }
    );

    setCachedData(cacheKey, response.data);

    console.log(` Fetched ${response.data.earningsCalendar?.length || 0} upcoming earnings`);

    return response.data;
  } catch (error) {
    console.error(' Failed to fetch upcoming earnings:', error);
    throw new AppError('Failed to fetch upcoming earnings', 500);
  }
}

/**
 * Clear all cached earnings data
 */
export async function clearCache(): Promise<void> {
  const cacheSize = cache.size;
  cache.clear();
  console.log(`  Cleared ${cacheSize} cached earnings entries`);
}