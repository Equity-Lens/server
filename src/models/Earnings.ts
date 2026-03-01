import pool from '../config/database';

export class Earnings {
  id?: number;
  symbol: string;
  date: string;
  quarter: number;
  year: number;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  hour: 'bmo' | 'amc' | 'dmh';
  rawData?: any;
  fetchedAt?: string;

  constructor(data: any) {
    this.id = data.id;
    this.symbol = data.symbol;
    this.date = data.date;
    this.quarter = data.quarter;
    this.year = data.year;
    this.epsActual = data.eps_actual;
    this.epsEstimate = data.eps_estimate;
    this.revenueActual = data.revenue_actual;
    this.revenueEstimate = data.revenue_estimate;
    this.hour = data.hour;
    this.rawData = data.raw_data;
    this.fetchedAt = data.fetched_at;
  }

  /**
   * Save earnings data to database
   */
  static async create(earningsData: any): Promise<Earnings> {
    const query = `
      INSERT INTO cached_earnings (
        symbol, date, quarter, year, eps_actual, eps_estimate,
        revenue_actual, revenue_estimate, hour, raw_data, fetched_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `;

    const values = [
      earningsData.symbol,
      earningsData.date,
      earningsData.quarter,
      earningsData.year,
      earningsData.epsActual,
      earningsData.epsEstimate,
      earningsData.revenueActual,
      earningsData.revenueEstimate,
      earningsData.hour,
      JSON.stringify(earningsData)
    ];

    const result = await pool.query(query, values);
    return new Earnings(result.rows[0]);
  }

  static async findBySymbolAndDateRange(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<Earnings[]> {
    const query = `
      SELECT * FROM cached_earnings
      WHERE symbol = $1 AND date >= $2 AND date <= $3
      ORDER BY date DESC
    `;

    const result = await pool.query(query, [symbol, startDate, endDate]);
    return result.rows.map(row => new Earnings(row));
  }

  static async findByDateRange(
    startDate: string,
    endDate: string
  ): Promise<Earnings[]> {
    const query = `
      SELECT * FROM cached_earnings
      WHERE date >= $1 AND date <= $2
      ORDER BY date DESC
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows.map(row => new Earnings(row));
  }

  static async findUpcomingBySymbol(symbol: string): Promise<Earnings[]> {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const query = `
      SELECT * FROM cached_earnings
      WHERE symbol = $1 AND date >= $2 AND date <= $3
      ORDER BY date ASC
    `;

    const result = await pool.query(query, [symbol, today, thirtyDaysLater]);
    return result.rows.map(row => new Earnings(row));
  }

  static async upsert(earningsData: any): Promise<Earnings> {
    const query = `
      INSERT INTO cached_earnings (
        symbol, date, quarter, year, eps_actual, eps_estimate,
        revenue_actual, revenue_estimate, hour, raw_data, fetched_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (symbol, date)
      DO UPDATE SET
        quarter = EXCLUDED.quarter,
        year = EXCLUDED.year,
        eps_actual = EXCLUDED.eps_actual,
        eps_estimate = EXCLUDED.eps_estimate,
        revenue_actual = EXCLUDED.revenue_actual,
        revenue_estimate = EXCLUDED.revenue_estimate,
        hour = EXCLUDED.hour,
        raw_data = EXCLUDED.raw_data,
        fetched_at = NOW()
      RETURNING *
    `;

    const values = [
      earningsData.symbol,
      earningsData.date,
      earningsData.quarter,
      earningsData.year,
      earningsData.epsActual,
      earningsData.epsEstimate,
      earningsData.revenueActual,
      earningsData.revenueEstimate,
      earningsData.hour,
      JSON.stringify(earningsData)
    ];

    const result = await pool.query(query, values);
    return new Earnings(result.rows[0]);
  }

  static async deleteOldCache(): Promise<number> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString();

    const query = `
      DELETE FROM cached_earnings
      WHERE fetched_at < $1
      RETURNING id
    `;

    const result = await pool.query(query, [ninetyDaysAgo]);
    return result.rowCount || 0;
  }

  static async getStatsBySymbol(symbol: string): Promise<any> {
    const query = `
      SELECT 
        symbol,
        COUNT(*) as total_earnings,
        AVG(
          CASE 
            WHEN eps_actual IS NOT NULL AND eps_estimate IS NOT NULL 
            THEN ((eps_actual - eps_estimate) / NULLIF(eps_estimate, 0)) * 100 
          END
        ) as avg_eps_beat_percent,
        AVG(
          CASE 
            WHEN revenue_actual IS NOT NULL AND revenue_estimate IS NOT NULL 
            THEN ((revenue_actual - revenue_estimate) / NULLIF(revenue_estimate, 0)) * 100 
          END
        ) as avg_revenue_beat_percent,
        COUNT(CASE WHEN eps_actual > eps_estimate THEN 1 END) as eps_beats,
        COUNT(CASE WHEN eps_actual < eps_estimate THEN 1 END) as eps_misses,
        COUNT(CASE WHEN revenue_actual > revenue_estimate THEN 1 END) as revenue_beats,
        COUNT(CASE WHEN revenue_actual < revenue_estimate THEN 1 END) as revenue_misses
      FROM cached_earnings
      WHERE symbol = $1
        AND eps_actual IS NOT NULL 
        AND eps_estimate IS NOT NULL
        AND date >= CURRENT_DATE - INTERVAL '2 years'
      GROUP BY symbol
    `;

    const result = await pool.query(query, [symbol]);
    return result.rows[0] || null;
  }

  static async bulkInsert(earningsArray: any[]): Promise<Earnings[]> {
    if (earningsArray.length === 0) return [];

    const values: any[] = [];
    const placeholders: string[] = [];

    earningsArray.forEach((item, index) => {
      const offset = index * 10;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, NOW())`
      );
      values.push(
        item.symbol,
        item.date,
        item.quarter,
        item.year,
        item.epsActual,
        item.epsEstimate,
        item.revenueActual,
        item.revenueEstimate,
        item.hour,
        JSON.stringify(item)
      );
    });

    const query = `
      INSERT INTO cached_earnings (
        symbol, date, quarter, year, eps_actual, eps_estimate,
        revenue_actual, revenue_estimate, hour, raw_data, fetched_at
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (symbol, date) DO NOTHING
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows.map(row => new Earnings(row));
  }
}