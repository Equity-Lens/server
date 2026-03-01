import axios from 'axios';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap: number;
  volume: number;
  timestamp: number;
}

export const stockService = {
  // Get quote for a single stock
  async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const upperSymbol = symbol.toUpperCase();

      // Fetch quote and company profile in parallel
      const [quoteRes, profileRes] = await Promise.all([
        axios.get(`${FINNHUB_BASE_URL}/quote`, {
          params: { symbol: upperSymbol, token: FINNHUB_API_KEY },
        }),
        axios.get(`${FINNHUB_BASE_URL}/stock/profile2`, {
          params: { symbol: upperSymbol, token: FINNHUB_API_KEY },
        }),
      ]);

      const quote = quoteRes.data;
      const profile = profileRes.data;

      // Check if valid data returned
      if (!quote || quote.c === 0) {
        console.warn(` No quote data for ${symbol}`);
        return null;
      }

      return {
        symbol: upperSymbol,
        name: profile?.name || upperSymbol,
        price: quote.c,           // Current price
        change: quote.d,          // Change
        changePercent: quote.dp,  // Change percent
        high: quote.h,            // High price of the day
        low: quote.l,             // Low price of the day
        open: quote.o,            // Open price of the day
        previousClose: quote.pc,  // Previous close price
        marketCap: (profile?.marketCapitalization || 0) * 1_000_000, // Convert from millions
        volume: 0,                // Quote endpoint doesn't include volume
        timestamp: quote.t,       // Timestamp
      };
    } catch (error) {
      console.error(` Error fetching quote for ${symbol}:`, error);
      return null;
    }
  },

  // Get quotes for multiple stocks
  async getQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const quotes = new Map<string, StockQuote>();

    if (symbols.length === 0) {
      return quotes;
    }

    console.log(` Fetching quotes for: ${symbols.join(', ')}`);

    // Fetch all quotes in parallel
    const results = await Promise.all(
      symbols.map((symbol) => this.getQuote(symbol))
    );

    // Map results to symbols
    results.forEach((quote, index) => {
      if (quote) {
        quotes.set(symbols[index].toUpperCase(), quote);
      }
    });

    console.log(` Fetched ${quotes.size}/${symbols.length} quotes`);

    return quotes;
  },

  // Validate if a symbol exists
  async validateSymbol(symbol: string): Promise<boolean> {
    const quote = await this.getQuote(symbol);
    return quote !== null;
  },
};

export default stockService;