import pool from '../config/database';

export const WatchlistModel = {
  // Get user's watchlist
  async getUserWatchlist(userId: number): Promise<any[]> {
    const query = `
      SELECT id, user_id, symbol, notes, alert_price, added_at
      FROM watchlist
      WHERE user_id = $1
      ORDER BY added_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  // Add stock to watchlist
  async addStock(
    userId: number,
    symbol: string,
    notes?: string,
    alertPrice?: number
  ): Promise<any> {
    const query = `
      INSERT INTO watchlist (user_id, symbol, notes, alert_price)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, symbol) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId,
      symbol.toUpperCase(),
      notes || null,
      alertPrice || null,
    ]);
    return result.rows[0];
  },

  // Remove stock from watchlist
  async removeStock(userId: number, symbol: string): Promise<void> {
    const query = `
      DELETE FROM watchlist
      WHERE user_id = $1 AND symbol = $2
    `;
    await pool.query(query, [userId, symbol.toUpperCase()]);
  },

  // Update notes and alert price
  async updateStock(
    userId: number,
    symbol: string,
    notes?: string,
    alertPrice?: number
  ): Promise<any> {
    const query = `
      UPDATE watchlist
      SET notes = $3, alert_price = $4
      WHERE user_id = $1 AND symbol = $2
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId,
      symbol.toUpperCase(),
      notes || null,
      alertPrice || null,
    ]);
    return result.rows[0];
  },

  // Check if stock is in watchlist
  async isInWatchlist(userId: number, symbol: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM watchlist 
        WHERE user_id = $1 AND symbol = $2
      ) as exists
    `;
    const result = await pool.query(query, [userId, symbol.toUpperCase()]);
    return result.rows[0].exists;
  },
};

export default WatchlistModel;