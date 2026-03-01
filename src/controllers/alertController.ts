import { Response } from 'express';
import { AuthRequest } from '../types';
import PriceAlertModel, { AlertType } from '../models/PriceAlert';
import alertService from '../services/alertService';
import emailService from '../services/emailService';
import stockService from '../services/stockService';

export const alertController = {

  // Get all alerts for user
  async getAlerts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      console.log(` Getting alerts for user ${req.user.userId}`);

      const alerts = await PriceAlertModel.getUserAlerts(req.user.userId);

      // Enrich alerts with description
      const enrichedAlerts = alerts.map((alert) => ({
        ...alert,
        description: alertService.getAlertDescription(
          alert.alert_type,
          Number(alert.target_value),
          alert.base_price ? Number(alert.base_price) : undefined
        ),
        targetPrice: alertService.calculateTargetPrice(
          alert.alert_type,
          Number(alert.target_value),
          alert.base_price ? Number(alert.base_price) : 0
        ),
      }));

      res.status(200).json({
        success: true,
        data: { alerts: enrichedAlerts },
      });
    } catch (error) {
      console.error(' Get alerts error:', error);
      res.status(500).json({ success: false, message: 'Failed to get alerts' });
    }
  },

  // Get active alerts only
  async getActiveAlerts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const alerts = await PriceAlertModel.getActiveAlerts(req.user.userId);

      const enrichedAlerts = alerts.map((alert) => ({
        ...alert,
        description: alertService.getAlertDescription(
          alert.alert_type,
          Number(alert.target_value),
          alert.base_price ? Number(alert.base_price) : undefined
        ),
      }));

      res.status(200).json({
        success: true,
        data: { alerts: enrichedAlerts },
      });
    } catch (error) {
      console.error(' Get active alerts error:', error);
      res.status(500).json({ success: false, message: 'Failed to get alerts' });
    }
  },

  // Get triggered alerts (notification history)
  async getTriggeredAlerts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const alerts = await PriceAlertModel.getTriggeredAlerts(req.user.userId, limit);

      const enrichedAlerts = alerts.map((alert) => ({
        ...alert,
        description: alertService.getAlertDescription(
          alert.alert_type,
          Number(alert.target_value),
          alert.base_price ? Number(alert.base_price) : undefined
        ),
      }));

      res.status(200).json({
        success: true,
        data: { alerts: enrichedAlerts },
      });
    } catch (error) {
      console.error(' Get triggered alerts error:', error);
      res.status(500).json({ success: false, message: 'Failed to get alerts' });
    }
  },

  // Get alerts count/summary
  async getAlertsSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const summary = await PriceAlertModel.getAlertsCount(req.user.userId);

      res.status(200).json({
        success: true,
        data: { summary },
      });
    } catch (error) {
      console.error(' Get alerts summary error:', error);
      res.status(500).json({ success: false, message: 'Failed to get alerts summary' });
    }
  },

  // Get single alert
  async getAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const alertId = parseInt(req.params.id);

      if (isNaN(alertId)) {
        res.status(400).json({ success: false, message: 'Invalid alert ID' });
        return;
      }

      const alert = await PriceAlertModel.getAlertById(alertId, req.user.userId);

      if (!alert) {
        res.status(404).json({ success: false, message: 'Alert not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          alert: {
            ...alert,
            description: alertService.getAlertDescription(
              alert.alert_type,
              Number(alert.target_value),
              alert.base_price ? Number(alert.base_price) : undefined
            ),
          },
        },
      });
    } catch (error) {
      console.error(' Get alert error:', error);
      res.status(500).json({ success: false, message: 'Failed to get alert' });
    }
  },

  // Create new alert
  async createAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const { symbol, alert_type, target_value } = req.body;

      // Validate required fields
      if (!symbol || !alert_type || target_value === undefined) {
        res.status(400).json({
          success: false,
          message: 'Symbol, alert_type, and target_value are required',
        });
        return;
      }

      // Validate alert type
      const validTypes: AlertType[] = ['price_above', 'price_below', 'percent_up', 'percent_down'];
      if (!validTypes.includes(alert_type)) {
        res.status(400).json({
          success: false,
          message: `Invalid alert_type. Must be one of: ${validTypes.join(', ')}`,
        });
        return;
      }

      // Validate target value
      if (typeof target_value !== 'number' || target_value <= 0) {
        res.status(400).json({
          success: false,
          message: 'target_value must be a positive number',
        });
        return;
      }

      // Validate symbol exists
      const quote = await stockService.getQuote(symbol);
      if (!quote) {
        res.status(400).json({
          success: false,
          message: `Invalid symbol: ${symbol}`,
        });
        return;
      }

      console.log(` Creating alert for ${symbol}: ${alert_type} ${target_value}`);

      // Create alert with current price as base for percent-based alerts
      const result = await alertService.createAlertWithCurrentPrice(
        req.user.userId,
        symbol,
        alert_type,
        target_value
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to create alert',
        });
        return;
      }

      const alert = result.alert;

      res.status(201).json({
        success: true,
        message: 'Alert created successfully',
        data: {
          alert: {
            ...alert,
            description: alertService.getAlertDescription(
              alert.alert_type,
              Number(alert.target_value),
              alert.base_price ? Number(alert.base_price) : undefined
            ),
            currentPrice: quote.price,
          },
        },
      });
    } catch (error) {
      console.error(' Create alert error:', error);
      res.status(500).json({ success: false, message: 'Failed to create alert' });
    }
  },

  // Update alert
  async updateAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const alertId = parseInt(req.params.id);
      const { target_value, is_active } = req.body;

      if (isNaN(alertId)) {
        res.status(400).json({ success: false, message: 'Invalid alert ID' });
        return;
      }

      console.log(` Updating alert ${alertId}`);

      const alert = await PriceAlertModel.updateAlert(alertId, req.user.userId, {
        target_value,
        is_active,
      });

      if (!alert) {
        res.status(404).json({ success: false, message: 'Alert not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Alert updated',
        data: {
          alert: {
            ...alert,
            description: alertService.getAlertDescription(
              alert.alert_type,
              Number(alert.target_value),
              alert.base_price ? Number(alert.base_price) : undefined
            ),
          },
        },
      });
    } catch (error) {
      console.error(' Update alert error:', error);
      res.status(500).json({ success: false, message: 'Failed to update alert' });
    }
  },

  // Delete alert
  async deleteAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const alertId = parseInt(req.params.id);

      if (isNaN(alertId)) {
        res.status(400).json({ success: false, message: 'Invalid alert ID' });
        return;
      }

      console.log(` Deleting alert ${alertId}`);

      const deleted = await PriceAlertModel.deleteAlert(alertId, req.user.userId);

      if (!deleted) {
        res.status(404).json({ success: false, message: 'Alert not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Alert deleted',
      });
    } catch (error) {
      console.error(' Delete alert error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete alert' });
    }
  },

  // Reset a triggered alert (make it active again)
  async resetAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const alertId = parseInt(req.params.id);

      if (isNaN(alertId)) {
        res.status(400).json({ success: false, message: 'Invalid alert ID' });
        return;
      }

      console.log(` Resetting alert ${alertId}`);

      const alert = await PriceAlertModel.resetAlert(alertId, req.user.userId);

      if (!alert) {
        res.status(404).json({ success: false, message: 'Alert not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Alert reset successfully',
        data: { alert },
      });
    } catch (error) {
      console.error(' Reset alert error:', error);
      res.status(500).json({ success: false, message: 'Failed to reset alert' });
    }
  },

  // Activate a paused alert
  async activateAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const alertId = parseInt(req.params.id);

      if (isNaN(alertId)) {
        res.status(400).json({ success: false, message: 'Invalid alert ID' });
        return;
      }

      const alert = await PriceAlertModel.activateAlert(alertId, req.user.userId);

      if (!alert) {
        res.status(404).json({ success: false, message: 'Alert not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Alert activated',
        data: { alert },
      });
    } catch (error) {
      console.error(' Activate alert error:', error);
      res.status(500).json({ success: false, message: 'Failed to activate alert' });
    }
  },

  // Deactivate (pause) an alert
  async deactivateAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const alertId = parseInt(req.params.id);

      if (isNaN(alertId)) {
        res.status(400).json({ success: false, message: 'Invalid alert ID' });
        return;
      }

      const alert = await PriceAlertModel.deactivateAlert(alertId, req.user.userId);

      if (!alert) {
        res.status(404).json({ success: false, message: 'Alert not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Alert deactivated',
        data: { alert },
      });
    } catch (error) {
      console.error(' Deactivate alert error:', error);
      res.status(500).json({ success: false, message: 'Failed to deactivate alert' });
    }
  },

  // Test email configuration
  async testEmail(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      const { email } = req.body;

      if (!email) {
        res.status(400).json({ success: false, message: 'Email is required' });
        return;
      }

      // Check if email service is configured
      if (!emailService.isConfigured()) {
        res.status(500).json({
          success: false,
          message: 'Email service is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.',
        });
        return;
      }

      console.log(` Sending test email to ${email}`);

      const sent = await emailService.sendTestEmail(email);

      if (sent) {
        res.status(200).json({
          success: true,
          message: `Test email sent to ${email}`,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send test email. Check server logs for details.',
        });
      }
    } catch (error) {
      console.error(' Test email error:', error);
      res.status(500).json({ success: false, message: 'Failed to send test email' });
    }
  },

  // Manually trigger alert check for all active alerts
  async checkAllAlerts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }

      console.log(` Manual alert check triggered by user ${req.user.userId}`);

      const results = await alertService.checkAllAlerts();

      const summary = {
        totalChecked: results.length,
        triggered: results.filter((r) => r.triggered).length,
        emailsSent: results.filter((r) => r.emailSent).length,
      };

      res.status(200).json({
        success: true,
        message: 'Alert check completed',
        data: { summary, results },
      });
    } catch (error) {
      console.error(' Check all alerts error:', error);
      res.status(500).json({ success: false, message: 'Failed to check alerts' });
    }
  },
};

export default alertController;