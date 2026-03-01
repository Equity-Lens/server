import PriceAlertModel, { AlertWithEmail, AlertType } from '../models/PriceAlert';
import emailService from './emailService';
import stockService from './stockService';

interface PriceData {
  symbol: string;
  price: number;
  previousClose: number;
}

interface AlertCheckResult {
  alertId: number;
  symbol: string;
  triggered: boolean;
  emailSent: boolean;
}

export const alertService = {
  // Check if an alert condition is met
  checkAlertCondition(
    alert: AlertWithEmail,
    currentPrice: number
  ): boolean {
    const { alert_type, target_value, base_price } = alert;

    switch (alert_type) {
      case 'price_above':
        // Trigger when price goes above target
        return currentPrice >= target_value;

      case 'price_below':
        // Trigger when price goes below target
        return currentPrice <= target_value;

      case 'percent_up':
        // Trigger when price increases by X% from base price
        if (!base_price || base_price <= 0) return false;
        const percentUp = ((currentPrice - base_price) / base_price) * 100;
        return percentUp >= target_value;

      case 'percent_down':
        // Trigger when price decreases by X% from base price
        if (!base_price || base_price <= 0) return false;
        const percentDown = ((base_price - currentPrice) / base_price) * 100;
        return percentDown >= target_value;

      default:
        return false;
    }
  },

  // Process a single alert
  async processAlert(
    alert: AlertWithEmail,
    currentPrice: number,
    previousClose: number
  ): Promise<AlertCheckResult> {
    const result: AlertCheckResult = {
      alertId: alert.id,
      symbol: alert.symbol,
      triggered: false,
      emailSent: false,
    };

    // Check if condition is met
    const isTriggered = this.checkAlertCondition(alert, currentPrice);

    if (!isTriggered) {
      return result;
    }

    console.log(` Alert triggered for ${alert.symbol} (Alert ID: ${alert.id})`);
    console.log(`   Type: ${alert.alert_type}, Target: ${alert.target_value}`);
    console.log(`   Current Price: $${currentPrice}`);

    // Mark alert as triggered in database
    await PriceAlertModel.triggerAlert(alert.id);
    result.triggered = true;

    // Calculate change values for email
    const basePrice = alert.base_price || previousClose;
    const change = currentPrice - basePrice;
    const changePercent = basePrice > 0 ? (change / basePrice) * 100 : 0;

    // Send email notification
    const emailSent = await emailService.sendPriceAlertEmail({
      to: alert.email,
      firstName: alert.first_name || 'Investor',
      symbol: alert.symbol,
      alertType: alert.alert_type,
      targetValue: alert.target_value,
      currentPrice,
      basePrice: alert.base_price || undefined,
      change,
      changePercent,
    });

    result.emailSent = emailSent;

    if (emailSent) {
      console.log(` Email sent to ${alert.email}`);
    } else {
      console.log(` Failed to send email to ${alert.email}`);
    }

    return result;
  },

  // Check alerts for a single symbol (called by WebSocket on price update)
  async checkAlertsForSymbol(priceData: PriceData): Promise<AlertCheckResult[]> {
    const { symbol, price, previousClose } = priceData;
    const results: AlertCheckResult[] = [];

    try {
      // Get all active alerts for this symbol
      const alerts = await PriceAlertModel.getActiveAlertsForSymbol(symbol);

      if (alerts.length === 0) {
        return results;
      }

      console.log(` Checking ${alerts.length} alerts for ${symbol} at $${price}`);

      // Process each alert
      for (const alert of alerts) {
        const result = await this.processAlert(alert, price, previousClose);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error(` Error checking alerts for ${symbol}:`, error);
      return results;
    }
  },

  // Batch check all alerts (can be run periodically)
  async checkAllAlerts(): Promise<AlertCheckResult[]> {
    const results: AlertCheckResult[] = [];

    try {
      // Get all active alerts
      const alerts = await PriceAlertModel.getAllActiveAlerts();

      if (alerts.length === 0) {
        console.log(' No active alerts to check');
        return results;
      }

      console.log(` Checking ${alerts.length} active alerts...`);

      // Group alerts by symbol
      const alertsBySymbol = new Map<string, AlertWithEmail[]>();
      for (const alert of alerts) {
        const existing = alertsBySymbol.get(alert.symbol) || [];
        existing.push(alert);
        alertsBySymbol.set(alert.symbol, existing);
      }

      // Fetch prices for all symbols
      const symbols = Array.from(alertsBySymbol.keys());
      const quotes = await stockService.getQuotes(symbols);

      // Check each symbol's alerts
      for (const [symbol, symbolAlerts] of alertsBySymbol) {
        const quote = quotes.get(symbol);

        if (!quote) {
          console.warn(` No quote data for ${symbol}, skipping alerts`);
          continue;
        }

        for (const alert of symbolAlerts) {
          const result = await this.processAlert(alert, quote.price, quote.previousClose);
          results.push(result);
        }
      }

      // Summary
      const triggeredCount = results.filter((r) => r.triggered).length;
      const emailsSentCount = results.filter((r) => r.emailSent).length;

      console.log(` Alert check complete:`);
      console.log(` Total checked: ${results.length}`);
      console.log(` Triggered: ${triggeredCount}`);
      console.log(` Emails sent: ${emailsSentCount}`);

      return results;
    } catch (error) {
      console.error(' Error in batch alert check:', error);
      return results;
    }
  },

  // Create alert helper with current price as base
  async createAlertWithCurrentPrice(
    userId: number,
    symbol: string,
    alertType: AlertType,
    targetValue: number
  ): Promise<{ success: boolean; alert?: any; error?: string }> {
    try {
      // Check if alert already exists
      const exists = await PriceAlertModel.alertExists(userId, symbol, alertType, targetValue);
      if (exists) {
        return { success: false, error: 'This alert already exists' };
      }

      // For percent-based alerts, fetch current price as base
      let basePrice: number | undefined;

      if (alertType === 'percent_up' || alertType === 'percent_down') {
        const quote = await stockService.getQuote(symbol);
        if (!quote) {
          return { success: false, error: 'Could not fetch current price for symbol' };
        }
        basePrice = quote.price;
      }

      // Create the alert
      const alert = await PriceAlertModel.createAlert(userId, {
        symbol,
        alert_type: alertType,
        target_value: targetValue,
        base_price: basePrice,
      });

      console.log(` Alert created for ${symbol}:`);
      console.log(`   Type: ${alertType}, Target: ${targetValue}`);
      if (basePrice) {
        console.log(`   Base Price: $${basePrice}`);
      }

      return { success: true, alert };
    } catch (error) {
      console.error(' Error creating alert:', error);
      return { success: false, error: 'Failed to create alert' };
    }
  },

  // Get alert description for display
  getAlertDescription(alertType: AlertType, targetValue: number, basePrice?: number): string {
    switch (alertType) {
      case 'price_above':
        return `Price goes above $${targetValue.toFixed(2)}`;
      case 'price_below':
        return `Price goes below $${targetValue.toFixed(2)}`;
      case 'percent_up':
        return `Price goes up by ${targetValue}%${basePrice ? ` from $${basePrice.toFixed(2)}` : ''}`;
      case 'percent_down':
        return `Price goes down by ${targetValue}%${basePrice ? ` from $${basePrice.toFixed(2)}` : ''}`;
      default:
        return 'Unknown alert type';
    }
  },

  // Calculate target price for percent-based alerts
  calculateTargetPrice(alertType: AlertType, targetValue: number, basePrice: number): number | null {
    switch (alertType) {
      case 'percent_up':
        return basePrice * (1 + targetValue / 100);
      case 'percent_down':
        return basePrice * (1 - targetValue / 100);
      case 'price_above':
      case 'price_below':
        return targetValue;
      default:
        return null;
    }
  },
};

export default alertService;