import pool from '../config/database';

export interface Portfolio {
  id: number;
  user_id: number;
  name: string;
  broker: string | null;
  description: string | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PortfolioHolding {
  id: number;
  portfolio_id: number;
  symbol: string;
  quantity: number;
  avg_buy_price: number;
  notes: string | null;
  added_at: Date;
  updated_at: Date;
}

export interface CreatePortfolioData {
  name: string;
  broker?: string;
  description?: string;
  is_default?: boolean;
}

export interface CreateHoldingData {
  symbol: string;
  quantity: number;
  avg_buy_price: number;
  notes?: string;
}

export const PortfolioModel = {

  // Get all portfolios for a user
  async getUserPortfolios(userId: number): Promise<Portfolio[]> {
    const query = `
      SELECT id, user_id, name, broker, description, is_default, created_at, updated_at
      FROM portfolios
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  // Get a single portfolio by ID
  async getPortfolioById(portfolioId: number, userId: number): Promise<Portfolio | null> {
    const query = `
      SELECT id, user_id, name, broker, description, is_default, created_at, updated_at
      FROM portfolios
      WHERE id = $1 AND user_id = $2
    `;
    const result = await pool.query(query, [portfolioId, userId]);
    return result.rows[0] || null;
  },

  // Create a new portfolio
  async createPortfolio(userId: number, data: CreatePortfolioData): Promise<Portfolio> {
    const { name, broker, description, is_default } = data;

    // If this is set as default, unset other defaults first
    if (is_default) {
      await pool.query(
        'UPDATE portfolios SET is_default = false WHERE user_id = $1',
        [userId]
      );
    }

    // Check if this is the user's first portfolio (make it default)
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM portfolios WHERE user_id = $1',
      [userId]
    );
    const isFirstPortfolio = parseInt(countResult.rows[0].count) === 0;

    const query = `
      INSERT INTO portfolios (user_id, name, broker, description, is_default)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId,
      name,
      broker || null,
      description || null,
      is_default || isFirstPortfolio,
    ]);

    return result.rows[0];
  },

  // Update a portfolio
  async updatePortfolio(
    portfolioId: number,
    userId: number,
    data: Partial<CreatePortfolioData>
  ): Promise<Portfolio | null> {
    const { name, broker, description, is_default } = data;

    // If setting as default, unset other defaults first
    if (is_default) {
      await pool.query(
        'UPDATE portfolios SET is_default = false WHERE user_id = $1 AND id != $2',
        [userId, portfolioId]
      );
    }

    const query = `
      UPDATE portfolios
      SET 
        name = COALESCE($3, name),
        broker = COALESCE($4, broker),
        description = COALESCE($5, description),
        is_default = COALESCE($6, is_default)
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [
      portfolioId,
      userId,
      name,
      broker,
      description,
      is_default,
    ]);

    return result.rows[0] || null;
  },

  // Delete a portfolio
  async deletePortfolio(portfolioId: number, userId: number): Promise<boolean> {
    const query = `
      DELETE FROM portfolios
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await pool.query(query, [portfolioId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  },

  // Set a portfolio as default
  async setDefaultPortfolio(portfolioId: number, userId: number): Promise<boolean> {
    // Unset all defaults for user
    await pool.query(
      'UPDATE portfolios SET is_default = false WHERE user_id = $1',
      [userId]
    );

    // Set the new default
    const query = `
      UPDATE portfolios
      SET is_default = true
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await pool.query(query, [portfolioId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  },

  // Get all holdings for a portfolio
  async getPortfolioHoldings(portfolioId: number): Promise<PortfolioHolding[]> {
    const query = `
      SELECT id, portfolio_id, symbol, quantity, avg_buy_price, notes, added_at, updated_at
      FROM portfolio_holdings
      WHERE portfolio_id = $1
      ORDER BY added_at DESC
    `;
    const result = await pool.query(query, [portfolioId]);
    return result.rows;
  },

  // Get a single holding
  async getHolding(portfolioId: number, symbol: string): Promise<PortfolioHolding | null> {
    const query = `
      SELECT id, portfolio_id, symbol, quantity, avg_buy_price, notes, added_at, updated_at
      FROM portfolio_holdings
      WHERE portfolio_id = $1 AND symbol = $2
    `;
    const result = await pool.query(query, [portfolioId, symbol.toUpperCase()]);
    return result.rows[0] || null;
  },

  // Add a holding to portfolio
  async addHolding(portfolioId: number, data: CreateHoldingData): Promise<PortfolioHolding | null> {
    const { symbol, quantity, avg_buy_price, notes } = data;

    const query = `
      INSERT INTO portfolio_holdings (portfolio_id, symbol, quantity, avg_buy_price, notes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (portfolio_id, symbol) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [
      portfolioId,
      symbol.toUpperCase(),
      quantity,
      avg_buy_price,
      notes || null,
    ]);

    return result.rows[0] || null;
  },

  // Update a holding
  async updateHolding(
    portfolioId: number,
    symbol: string,
    data: Partial<CreateHoldingData>
  ): Promise<PortfolioHolding | null> {
    const { quantity, avg_buy_price, notes } = data;

    const query = `
      UPDATE portfolio_holdings
      SET 
        quantity = COALESCE($3, quantity),
        avg_buy_price = COALESCE($4, avg_buy_price),
        notes = COALESCE($5, notes)
      WHERE portfolio_id = $1 AND symbol = $2
      RETURNING *
    `;
    const result = await pool.query(query, [
      portfolioId,
      symbol.toUpperCase(),
      quantity,
      avg_buy_price,
      notes,
    ]);

    return result.rows[0] || null;
  },

  // Remove a holding from portfolio
  async removeHolding(portfolioId: number, symbol: string): Promise<boolean> {
    const query = `
      DELETE FROM portfolio_holdings
      WHERE portfolio_id = $1 AND symbol = $2
      RETURNING id
    `;
    const result = await pool.query(query, [portfolioId, symbol.toUpperCase()]);
    return result.rowCount !== null && result.rowCount > 0;
  },

  // Check if user owns the portfolio
  async userOwnsPortfolio(portfolioId: number, userId: number): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM portfolios
        WHERE id = $1 AND user_id = $2
      ) as exists
    `;
    const result = await pool.query(query, [portfolioId, userId]);
    return result.rows[0].exists;
  },

  // Get portfolio summary (total holdings count)
  async getPortfolioSummary(portfolioId: number): Promise<{ holdingsCount: number }> {
    const query = `
      SELECT COUNT(*) as count
      FROM portfolio_holdings
      WHERE portfolio_id = $1
    `;
    const result = await pool.query(query, [portfolioId]);
    return { holdingsCount: parseInt(result.rows[0].count) };
  },

  // Get all holdings for a user (across all portfolios)
  async getAllUserHoldings(userId: number): Promise<PortfolioHolding[]> {
    const query = `
      SELECT ph.id, ph.portfolio_id, ph.symbol, ph.quantity, ph.avg_buy_price, ph.notes, ph.added_at, ph.updated_at
      FROM portfolio_holdings ph
      JOIN portfolios p ON ph.portfolio_id = p.id
      WHERE p.user_id = $1
      ORDER BY ph.added_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },
};

export default PortfolioModel;