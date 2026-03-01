import { Response } from 'express';
import { AuthRequest } from '../types';
import WatchlistModel from '../models/Watchlist';
import stockService from '../services/stockService';

export const watchlistController = {
  // Get user's watchlist with live stock data
  async getWatchlist(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      console.log(` Getting watchlist for user ${req.user.userId}`);

      // Get watchlist items from database
      const watchlistItems = await WatchlistModel.getUserWatchlist(req.user.userId);

      // If watchlist is empty, return early
      if (watchlistItems.length === 0) {
        res.status(200).json({
          success: true,
          data: { watchlist: [] },
        });
        return;
      }

      // Extract symbols from watchlist
      const symbols = watchlistItems.map((item) => item.symbol);

      // Fetch live stock data for all symbols from Finnhub
      const stockQuotes = await stockService.getQuotes(symbols);

      // Merge watchlist items with live stock data
      const enrichedWatchlist = watchlistItems.map((item) => {
        const quote = stockQuotes.get(item.symbol.toUpperCase());

        return {
          id: item.id,
          symbol: item.symbol,
          name: quote?.name || item.symbol,
          price: quote?.price || 0,
          change: quote?.change || 0,
          changePercent: quote?.changePercent || 0,
          high: quote?.high || 0,
          low: quote?.low || 0,
          open: quote?.open || 0,
          previousClose: quote?.previousClose || 0,
          marketCap: quote?.marketCap || 0,
          volume: quote?.volume || 0,
          addedAt: item.added_at,
          notes: item.notes,
          alertPrice: item.alert_price,
        };
      });

      res.status(200).json({
        success: true,
        data: { watchlist: enrichedWatchlist },
      });
    } catch (error) {
      console.error(' Get watchlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get watchlist',
      });
    }
  },

  // Add stock to watchlist
  async addStock(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const { symbol, notes, alertPrice } = req.body;

      if (!symbol) {
        res.status(400).json({
          success: false,
          message: 'Symbol is required',
        });
        return;
      }

      const upperSymbol = symbol.toUpperCase().trim();

      // Validate symbol exists by fetching quote from Finnhub
      const quote = await stockService.getQuote(upperSymbol);

      if (!quote) {
        res.status(400).json({
          success: false,
          message: `Invalid symbol: ${upperSymbol}. Please enter a valid stock ticker.`,
        });
        return;
      }

      console.log(` Adding ${upperSymbol} to watchlist for user ${req.user.userId}`);

      // Add to database
      const item = await WatchlistModel.addStock(
        req.user.userId,
        upperSymbol,
        notes,
        alertPrice
      );

      if (!item) {
        res.status(400).json({
          success: false,
          message: `${upperSymbol} is already in your watchlist`,
        });
        return;
      }

      // Return the new item with full stock data
      res.status(201).json({
        success: true,
        message: `${upperSymbol} added to watchlist`,
        data: {
          item: {
            id: item.id,
            symbol: item.symbol,
            name: quote.name,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            high: quote.high,
            low: quote.low,
            open: quote.open,
            previousClose: quote.previousClose,
            marketCap: quote.marketCap,
            volume: quote.volume,
            addedAt: item.added_at,
            notes: item.notes,
            alertPrice: item.alert_price,
          },
        },
      });
    } catch (error) {
      console.error(' Add to watchlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add stock',
      });
    }
  },

  // Remove stock from watchlist
  async removeStock(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const { symbol } = req.params;
      const upperSymbol = symbol.toUpperCase().trim();

      console.log(` Removing ${upperSymbol} from watchlist for user ${req.user.userId}`);

      await WatchlistModel.removeStock(req.user.userId, upperSymbol);

      res.status(200).json({
        success: true,
        message: `${upperSymbol} removed from watchlist`,
      });
    } catch (error) {
      console.error(' Remove from watchlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove stock',
      });
    }
  },

  // Update watchlist item (notes, alert price)
  async updateStock(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const { symbol } = req.params;
      const { notes, alertPrice } = req.body;
      const upperSymbol = symbol.toUpperCase().trim();

      console.log(` Updating ${upperSymbol} for user ${req.user.userId}`);

      const item = await WatchlistModel.updateStock(
        req.user.userId,
        upperSymbol,
        notes,
        alertPrice
      );

      if (!item) {
        res.status(404).json({
          success: false,
          message: `${upperSymbol} not found in watchlist`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Watchlist updated',
        data: { item },
      });
    } catch (error) {
      console.error(' Update watchlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update watchlist',
      });
    }
  },
};

export default watchlistController;