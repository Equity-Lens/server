import pool from '../config/database';

export type AlertType = 'price_above' | 'price_below' | 'percent_up' | 'percent_down';

export interface PriceAlert {
  id: number;
  user_id: number;
  symbol: string;
  alert_type: AlertType;
  target_value: number;
  base_price: number | null;
  is_active: boolean;
  is_triggered: boolean;
  triggered_at: Date | null;
  created_at: Date;
}

export interface CreateAlertData {
  symbol: string;
  alert_type: AlertType;
  target_value: number;
  base_price?: number;
}

export interface AlertWithEmail extends PriceAlert {
  email: string;
  first_name: string;
}

export const PriceAlertModel = {

  // Get all alerts for a user
  async getUserAlerts(userId: number): Promise<PriceAlert[]> {
    const query = `
      SELECT id, user_id, symbol, alert_type, target_value, base_price, 
             is_active, is_triggered, triggered_at, created_at
      FROM price_alerts
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  // Get active alerts for a user
  async getActiveAlerts(userId: number): Promise<PriceAlert[]> {
    const query = `
      SELECT id, user_id, symbol, alert_type, target_value, base_price, 
             is_active, is_triggered, triggered_at, created_at
      FROM price_alerts
      WHERE user_id = $1 AND is_active = true AND is_triggered = false
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  // Get a single alert by ID
  async getAlertById(alertId: number, userId: number): Promise<PriceAlert | null> {
    const query = `
      SELECT id, user_id, symbol, alert_type, target_value, base_price, 
             is_active, is_triggered, triggered_at, created_at
      FROM price_alerts
      WHERE id = $1 AND user_id = $2
    `;
    const result = await pool.query(query, [alertId, userId]);
    return result.rows[0] || null;
  },

  // Create a new alert
  async createAlert(userId: number, data: CreateAlertData): Promise<PriceAlert> {
    const { symbol, alert_type, target_value, base_price } = data;

    const query = `
      INSERT INTO price_alerts (user_id, symbol, alert_type, target_value, base_price)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId,
      symbol.toUpperCase(),
      alert_type,
      target_value,
      base_price || null,
    ]);

    return result.rows[0];
  },

  // Update an alert
  async updateAlert(
    alertId: number,
    userId: number,
    data: Partial<CreateAlertData & { is_active: boolean }>
  ): Promise<PriceAlert | null> {
    const { target_value, is_active } = data;

    const query = `
      UPDATE price_alerts
      SET 
        target_value = COALESCE($3, target_value),
        is_active = COALESCE($4, is_active)
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [
      alertId,
      userId,
      target_value,
      is_active,
    ]);

    return result.rows[0] || null;
  },

  // Delete an alert
  async deleteAlert(alertId: number, userId: number): Promise<boolean> {
    const query = `
      DELETE FROM price_alerts
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await pool.query(query, [alertId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  },

  // Get all active alerts for a specific symbol (for price checking)
  async getActiveAlertsForSymbol(symbol: string): Promise<AlertWithEmail[]> {
    const query = `
      SELECT pa.id, pa.user_id, pa.symbol, pa.alert_type, pa.target_value, 
             pa.base_price, pa.is_active, pa.is_triggered, pa.triggered_at, 
             pa.created_at, u.email, u.first_name
      FROM price_alerts pa
      JOIN users u ON pa.user_id = u.id
      WHERE pa.symbol = $1 AND pa.is_active = true AND pa.is_triggered = false
    `;
    const result = await pool.query(query, [symbol.toUpperCase()]);
    return result.rows;
  },

  // Get all active alerts (for batch processing)
  async getAllActiveAlerts(): Promise<AlertWithEmail[]> {
    const query = `
      SELECT pa.id, pa.user_id, pa.symbol, pa.alert_type, pa.target_value, 
             pa.base_price, pa.is_active, pa.is_triggered, pa.triggered_at, 
             pa.created_at, u.email, u.first_name
      FROM price_alerts pa
      JOIN users u ON pa.user_id = u.id
      WHERE pa.is_active = true AND pa.is_triggered = false
      ORDER BY pa.symbol
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  // Mark an alert as triggered
  async triggerAlert(alertId: number): Promise<PriceAlert | null> {
    const query = `
      UPDATE price_alerts
      SET is_triggered = true, triggered_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [alertId]);
    return result.rows[0] || null;
  },

  // Reset a triggered alert (make it active again)
  async resetAlert(alertId: number, userId: number): Promise<PriceAlert | null> {
    const query = `
      UPDATE price_alerts
      SET is_triggered = false, triggered_at = NULL
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [alertId, userId]);
    return result.rows[0] || null;
  },

  // Deactivate an alert
  async deactivateAlert(alertId: number, userId: number): Promise<PriceAlert | null> {
    const query = `
      UPDATE price_alerts
      SET is_active = false
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [alertId, userId]);
    return result.rows[0] || null;
  },

  // Reactivate an alert
  async activateAlert(alertId: number, userId: number): Promise<PriceAlert | null> {
    const query = `
      UPDATE price_alerts
      SET is_active = true
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [alertId, userId]);
    return result.rows[0] || null;
  },

  // Check if alert already exists
  async alertExists(
    userId: number,
    symbol: string,
    alertType: AlertType,
    targetValue: number
  ): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM price_alerts
        WHERE user_id = $1 AND symbol = $2 AND alert_type = $3 AND target_value = $4
      ) as exists
    `;
    const result = await pool.query(query, [
      userId,
      symbol.toUpperCase(),
      alertType,
      targetValue,
    ]);
    return result.rows[0].exists;
  },

  // Get alerts count for a user
  async getAlertsCount(userId: number): Promise<{ total: number; active: number; triggered: number }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true AND is_triggered = false) as active,
        COUNT(*) FILTER (WHERE is_triggered = true) as triggered
      FROM price_alerts
      WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return {
      total: parseInt(result.rows[0].total),
      active: parseInt(result.rows[0].active),
      triggered: parseInt(result.rows[0].triggered),
    };
  },

  // Delete all alerts for a symbol (when removing from portfolio)
  async deleteAlertsForSymbol(userId: number, symbol: string): Promise<number> {
    const query = `
      DELETE FROM price_alerts
      WHERE user_id = $1 AND symbol = $2
      RETURNING id
    `;
    const result = await pool.query(query, [userId, symbol.toUpperCase()]);
    return result.rowCount || 0;
  },

  // Get triggered alerts for a user (for notification history)
  async getTriggeredAlerts(userId: number, limit: number = 10): Promise<PriceAlert[]> {
    const query = `
      SELECT id, user_id, symbol, alert_type, target_value, base_price, 
             is_active, is_triggered, triggered_at, created_at
      FROM price_alerts
      WHERE user_id = $1 AND is_triggered = true
      ORDER BY triggered_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  },
};

export default PriceAlertModel;