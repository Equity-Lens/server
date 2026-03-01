import { Request, Response } from 'express';
import newsService from '../services/newsService';

export const newsController = {
  
  // Get general market news
  async getMarketNews(req: Request, res: Response) {
    try {
      const category = (req.query.category as string) || 'general';
      
      // Valid categories: general, forex, crypto, merger
      const validCategories = ['general', 'forex', 'crypto', 'merger'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category. Valid options: general, forex, crypto, merger',
        });
      }

      const news = await newsService.getMarketNews(category);

      return res.json({
        success: true,
        data: news,
        count: news.length,
      });
    } catch (error) {
      console.error('Get market news error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch market news',
      });
    }
  },

  // Get news for a specific company
  async getCompanyNews(req: Request, res: Response) {
    try {
      const { symbol } = req.params;
      const { from, to } = req.query;

      if (!symbol) {
        return res.status(400).json({
          success: false,
          error: 'Symbol is required',
        });
      }

      const news = await newsService.getCompanyNews(
        symbol,
        from as string,
        to as string
      );

      return res.json({
        success: true,
        data: news,
        count: news.length,
        symbol: symbol.toUpperCase(),
      });
    } catch (error) {
      console.error('Get company news error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch company news',
      });
    }
  },
};

export default newsController;