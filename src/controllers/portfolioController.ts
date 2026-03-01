import { Response } from 'express';
import { AuthRequest } from '../types';
import PortfolioModel from '../models/Portfolio';
import PriceAlertModel from '../models/PriceAlert';
import stockService from '../services/stockService';

export const portfolioController = {

  // Get all portfolios for user
  async getPortfolios(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      console.log(` Getting portfolios for user ${req.user.userId}`);

      const portfolios = await PortfolioModel.getUserPortfolios(req.user.userId);

      // Get holdings count for each portfolio
      const portfoliosWithCount = await Promise.all(
        portfolios.map(async (portfolio) => {
          const summary = await PortfolioModel.getPortfolioSummary(portfolio.id);
          return {
            ...portfolio,
            holdingsCount: summary.holdingsCount,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: { portfolios: portfoliosWithCount },
      });
    } catch (error) {
      console.error(' Get portfolios error:', error);
      res.status(500).json({ success: false, message: 'Failed to get portfolios' });
    }
  },

  // Get single portfolio with holdings
  async getPortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const portfolioId = parseInt(req.params.id);

      if (isNaN(portfolioId)) {
        res.status(400).json({ success: false, message: 'Invalid portfolio ID' });
        return;
      }

      // Check ownership
      const portfolio = await PortfolioModel.getPortfolioById(portfolioId, req.user.userId);

      if (!portfolio) {
        res.status(404).json({ success: false, message: 'Portfolio not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: { portfolio },
      });
    } catch (error) {
      console.error(' Get portfolio error:', error);
      res.status(500).json({ success: false, message: 'Failed to get portfolio' });
    }
  },

  // Create new portfolio
  async createPortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const { name, broker, description, is_default } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ success: false, message: 'Portfolio name is required' });
        return;
      }

      console.log(` Creating portfolio "${name}" for user ${req.user.userId}`);

      const portfolio = await PortfolioModel.createPortfolio(req.user.userId, {
        name: name.trim(),
        broker: broker?.trim(),
        description: description?.trim(),
        is_default,
      });

      res.status(201).json({
        success: true,
        message: 'Portfolio created successfully',
        data: { portfolio },
      });
    } catch (error: any) {
      console.error(' Create portfolio error:', error);

      // Handle duplicate name error
      if (error.code === '23505') {
        res.status(400).json({ success: false, message: 'Portfolio with this name already exists' });
        return;
      }

      res.status(500).json({ success: false, message: 'Failed to create portfolio' });
    }
  },

  // Update portfolio
  async updatePortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const portfolioId = parseInt(req.params.id);
      const { name, broker, description, is_default } = req.body;

      if (isNaN(portfolioId)) {
        res.status(400).json({ success: false, message: 'Invalid portfolio ID' });
        return;
      }

      console.log(` Updating portfolio ${portfolioId} for user ${req.user.userId}`);

      const portfolio = await PortfolioModel.updatePortfolio(portfolioId, req.user.userId, {
        name: name?.trim(),
        broker: broker?.trim(),
        description: description?.trim(),
        is_default,
      });

      if (!portfolio) {
        res.status(404).json({ success: false, message: 'Portfolio not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Portfolio updated successfully',
        data: { portfolio },
      });
    } catch (error) {
      console.error(' Update portfolio error:', error);
      res.status(500).json({ success: false, message: 'Failed to update portfolio' });
    }
  },

  // Delete portfolio
  async deletePortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const portfolioId = parseInt(req.params.id);

      if (isNaN(portfolioId)) {
        res.status(400).json({ success: false, message: 'Invalid portfolio ID' });
        return;
      }

      console.log(`🗑️ Deleting portfolio ${portfolioId} for user ${req.user.userId}`);

      const deleted = await PortfolioModel.deletePortfolio(portfolioId, req.user.userId);

      if (!deleted) {
        res.status(404).json({ success: false, message: 'Portfolio not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Portfolio deleted successfully',
      });
    } catch (error) {
      console.error(' Delete portfolio error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete portfolio' });
    }
  },

  // Set default portfolio
  async setDefaultPortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const portfolioId = parseInt(req.params.id);

      if (isNaN(portfolioId)) {
        res.status(400).json({ success: false, message: 'Invalid portfolio ID' });
        return;
      }

      const success = await PortfolioModel.setDefaultPortfolio(portfolioId, req.user.userId);

      if (!success) {
        res.status(404).json({ success: false, message: 'Portfolio not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Default portfolio updated',
      });
    } catch (error) {
      console.error(' Set default portfolio error:', error);
      res.status(500).json({ success: false, message: 'Failed to set default portfolio' });
    }
  },

  // Get portfolio holdings with live prices
  async getHoldings(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const portfolioId = parseInt(req.params.id);

      if (isNaN(portfolioId)) {
        res.status(400).json({ success: false, message: 'Invalid portfolio ID' });
        return;
      }

      // Check ownership
      const ownsPortfolio = await PortfolioModel.userOwnsPortfolio(portfolioId, req.user.userId);

      if (!ownsPortfolio) {
        res.status(404).json({ success: false, message: 'Portfolio not found' });
        return;
      }

      console.log(` Getting holdings for portfolio ${portfolioId}`);

      // Get holdings from database
      const holdings = await PortfolioModel.getPortfolioHoldings(portfolioId);

      if (holdings.length === 0) {
        res.status(200).json({
          success: true,
          data: {
            holdings: [],
            summary: {
              totalValue: 0,
              totalInvested: 0,
              totalPnL: 0,
              totalPnLPercent: 0,
              todayPnL: 0,
              todayPnLPercent: 0,
            },
          },
        });
        return;
      }

      // Fetch live prices for all symbols
      const symbols = holdings.map((h) => h.symbol);
      const quotes = await stockService.getQuotes(symbols);

      // Enrich holdings with live data and calculate P&L
      let totalValue = 0;
      let totalInvested = 0;
      let todayPnL = 0;

      const enrichedHoldings = holdings.map((holding) => {
        const quote = quotes.get(holding.symbol);
        const currentPrice = quote?.price || 0;
        const previousClose = quote?.previousClose || currentPrice;

        const quantity = Number(holding.quantity);
        const avgPrice = Number(holding.avg_buy_price);

        const investedValue = quantity * avgPrice;
        const currentValue = quantity * currentPrice;
        const pnl = currentValue - investedValue;
        const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

        const dayChange = currentPrice - previousClose;
        const dayPnL = quantity * dayChange;
        const dayPnLPercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;

        totalValue += currentValue;
        totalInvested += investedValue;
        todayPnL += dayPnL;

        return {
          id: holding.id,
          portfolioId: holding.portfolio_id,
          symbol: holding.symbol,
          name: quote?.name || holding.symbol,
          quantity,
          avgBuyPrice: avgPrice,
          currentPrice,
          previousClose,
          investedValue,
          currentValue,
          pnl,
          pnlPercent,
          dayChange,
          dayPnL,
          dayPnLPercent,
          marketCap: quote?.marketCap || 0,
          notes: holding.notes,
          addedAt: holding.added_at,
        };
      });

      const totalPnL = totalValue - totalInvested;
      const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
      const todayPnLPercent = totalValue > 0 ? (todayPnL / (totalValue - todayPnL)) * 100 : 0;

      res.status(200).json({
        success: true,
        data: {
          holdings: enrichedHoldings,
          summary: {
            totalValue,
            totalInvested,
            totalPnL,
            totalPnLPercent,
            todayPnL,
            todayPnLPercent,
            holdingsCount: enrichedHoldings.length,
          },
        },
      });
    } catch (error) {
      console.error(' Get holdings error:', error);
      res.status(500).json({ success: false, message: 'Failed to get holdings' });
    }
  },

  // Add holding to portfolio
  async addHolding(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const portfolioId = parseInt(req.params.id);
      const { symbol, quantity, avg_buy_price, notes } = req.body;

      if (isNaN(portfolioId)) {
        res.status(400).json({ success: false, message: 'Invalid portfolio ID' });
        return;
      }

      // Validate required fields
      if (!symbol || !quantity || !avg_buy_price) {
        res.status(400).json({
          success: false,
          message: 'Symbol, quantity, and average buy price are required',
        });
        return;
      }

      if (quantity <= 0 || avg_buy_price <= 0) {
        res.status(400).json({
          success: false,
          message: 'Quantity and average buy price must be positive',
        });
        return;
      }

      // Check ownership
      const ownsPortfolio = await PortfolioModel.userOwnsPortfolio(portfolioId, req.user.userId);

      if (!ownsPortfolio) {
        res.status(404).json({ success: false, message: 'Portfolio not found' });
        return;
      }

      // Validate symbol exists
      const quote = await stockService.getQuote(symbol);

      if (!quote) {
        res.status(400).json({
          success: false,
          message: `Invalid symbol: ${symbol}. Please enter a valid stock ticker.`,
        });
        return;
      }

      console.log(` Adding ${symbol} to portfolio ${portfolioId}`);

      const holding = await PortfolioModel.addHolding(portfolioId, {
        symbol,
        quantity,
        avg_buy_price,
        notes,
      });

      if (!holding) {
        res.status(400).json({
          success: false,
          message: `${symbol} is already in this portfolio`,
        });
        return;
      }

      // Return enriched holding
      const currentPrice = quote.price;
      const investedValue = quantity * avg_buy_price;
      const currentValue = quantity * currentPrice;
      const pnl = currentValue - investedValue;
      const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

      res.status(201).json({
        success: true,
        message: `${symbol} added to portfolio`,
        data: {
          holding: {
            id: holding.id,
            portfolioId: holding.portfolio_id,
            symbol: holding.symbol,
            name: quote.name,
            quantity: Number(holding.quantity),
            avgBuyPrice: Number(holding.avg_buy_price),
            currentPrice,
            previousClose: quote.previousClose,
            investedValue,
            currentValue,
            pnl,
            pnlPercent,
            dayChange: quote.change,
            dayPnL: quantity * quote.change,
            dayPnLPercent: quote.changePercent,
            marketCap: quote.marketCap,
            notes: holding.notes,
            addedAt: holding.added_at,
          },
        },
      });
    } catch (error) {
      console.error(' Add holding error:', error);
      res.status(500).json({ success: false, message: 'Failed to add holding' });
    }
  },

  // Update holding
  async updateHolding(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const portfolioId = parseInt(req.params.id);
      const { symbol } = req.params;
      const { quantity, avg_buy_price, notes } = req.body;

      if (isNaN(portfolioId)) {
        res.status(400).json({ success: false, message: 'Invalid portfolio ID' });
        return;
      }

      // Check ownership
      const ownsPortfolio = await PortfolioModel.userOwnsPortfolio(portfolioId, req.user.userId);

      if (!ownsPortfolio) {
        res.status(404).json({ success: false, message: 'Portfolio not found' });
        return;
      }

      console.log(` Updating ${symbol} in portfolio ${portfolioId}`);

      const holding = await PortfolioModel.updateHolding(portfolioId, symbol, {
        quantity,
        avg_buy_price,
        notes,
      });

      if (!holding) {
        res.status(404).json({ success: false, message: 'Holding not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Holding updated',
        data: { holding },
      });
    } catch (error) {
      console.error(' Update holding error:', error);
      res.status(500).json({ success: false, message: 'Failed to update holding' });
    }
  },

  // Remove holding from portfolio
  async removeHolding(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const portfolioId = parseInt(req.params.id);
      const { symbol } = req.params;

      if (isNaN(portfolioId)) {
        res.status(400).json({ success: false, message: 'Invalid portfolio ID' });
        return;
      }

      // Check ownership
      const ownsPortfolio = await PortfolioModel.userOwnsPortfolio(portfolioId, req.user.userId);

      if (!ownsPortfolio) {
        res.status(404).json({ success: false, message: 'Portfolio not found' });
        return;
      }

      console.log(` Removing ${symbol} from portfolio ${portfolioId}`);

      const removed = await PortfolioModel.removeHolding(portfolioId, symbol);

      if (!removed) {
        res.status(404).json({ success: false, message: 'Holding not found' });
        return;
      }

      // Also delete any alerts for this symbol
      await PriceAlertModel.deleteAlertsForSymbol(req.user.userId, symbol);

      res.status(200).json({
        success: true,
        message: `${symbol} removed from portfolio`,
      });
    } catch (error) {
      console.error(' Remove holding error:', error);
      res.status(500).json({ success: false, message: 'Failed to remove holding' });
    }
  },
};

export default portfolioController;