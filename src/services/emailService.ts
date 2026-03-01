import nodemailer from 'nodemailer';
import type { AlertType } from '../models/PriceAlert';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// Create transporter
const createTransporter = () => {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error(' Gmail credentials not configured in environment variables');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
};

const getAlertTypeText = (alertType: AlertType): string => {
  switch (alertType) {
    case 'price_above':
      return 'Price went above';
    case 'price_below':
      return 'Price went below';
    case 'percent_up':
      return 'Price went up by';
    case 'percent_down':
      return 'Price went down by';
    default:
      return 'Price alert';
  }
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

// Generate HTML email template
const generateAlertEmailHTML = (data: {
  firstName: string;
  symbol: string;
  alertType: AlertType;
  targetValue: number;
  currentPrice: number;
  basePrice?: number;
  change: number;
  changePercent: number;
}): string => {
  const { firstName, symbol, alertType, targetValue, currentPrice, basePrice, change, changePercent } = data;
  
  const isPositive = change >= 0;
  const changeColor = isPositive ? '#22c55e' : '#ef4444';
  const alertTypeText = getAlertTypeText(alertType);
  
  // Format target based on alert type
  const targetDisplay = alertType.includes('percent') 
    ? `${targetValue}%` 
    : formatCurrency(targetValue);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Price Alert - ${symbol}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                 Price Alert Triggered
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
                Hi ${firstName},
              </p>
              
              <p style="color: #374151; font-size: 16px; margin: 0 0 30px 0;">
                Your price alert for <strong style="color: #3b82f6;">${symbol}</strong> has been triggered!
              </p>
              
              <!-- Alert Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <span style="color: #6b7280; font-size: 14px;">Alert Condition</span><br>
                          <span style="color: #1f2937; font-size: 18px; font-weight: 600;">${alertTypeText} ${targetDisplay}</span>
                        </td>
                      </tr>
                      ${basePrice ? `
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <span style="color: #6b7280; font-size: 14px;">Base Price</span><br>
                          <span style="color: #1f2937; font-size: 18px; font-weight: 600;">${formatCurrency(basePrice)}</span>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <span style="color: #6b7280; font-size: 14px;">Current Price</span><br>
                          <span style="color: #1f2937; font-size: 24px; font-weight: 700;">${formatCurrency(currentPrice)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="color: #6b7280; font-size: 14px;">Change</span><br>
                          <span style="color: ${changeColor}; font-size: 18px; font-weight: 600;">
                            ${isPositive ? '▲' : '▼'} ${formatCurrency(Math.abs(change))} (${formatPercent(changePercent)})
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Timestamp -->
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 30px 0;">
                <strong>Time:</strong> ${new Date().toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/portfolio" 
                       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Portfolio
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                      Trading Platform
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      You received this email because you set up a price alert for ${symbol}.<br>
                      To manage your alerts, visit your portfolio settings.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Generate plain text version
const generateAlertEmailText = (data: {
  firstName: string;
  symbol: string;
  alertType: AlertType;
  targetValue: number;
  currentPrice: number;
  basePrice?: number;
  change: number;
  changePercent: number;
}): string => {
  const { firstName, symbol, alertType, targetValue, currentPrice, basePrice, change, changePercent } = data;
  
  const alertTypeText = getAlertTypeText(alertType);
  const targetDisplay = alertType.includes('percent') 
    ? `${targetValue}%` 
    : formatCurrency(targetValue);

  return `
Price Alert Triggered - ${symbol}

Hi ${firstName},

Your price alert for ${symbol} has been triggered!

Alert Condition: ${alertTypeText} ${targetDisplay}
${basePrice ? `Base Price: ${formatCurrency(basePrice)}` : ''}
Current Price: ${formatCurrency(currentPrice)}
Change: ${change >= 0 ? '+' : ''}${formatCurrency(change)} (${formatPercent(changePercent)})

Time: ${new Date().toLocaleString()}

View your portfolio: ${process.env.CLIENT_URL || 'http://localhost:5173'}/portfolio

---
Trading Platform
You received this email because you set up a price alert for ${symbol}.
  `.trim();
};

// Email Service
export const emailService = {
  // Check if email service is configured
  isConfigured(): boolean {
    return !!(GMAIL_USER && GMAIL_APP_PASSWORD);
  },

  // Send price alert email
  async sendPriceAlertEmail(data: {
    to: string;
    firstName: string;
    symbol: string;
    alertType: AlertType;
    targetValue: number;
    currentPrice: number;
    basePrice?: number;
    change: number;
    changePercent: number;
  }): Promise<boolean> {
    const transporter = createTransporter();

    if (!transporter) {
      console.error(' Email transporter not configured');
      return false;
    }

    const { to, ...templateData } = data;

    try {
      const mailOptions = {
        from: `Trading Platform <${GMAIL_USER}>`,
        to,
        subject: ` Price Alert: ${data.symbol} - ${getAlertTypeText(data.alertType)} ${
          data.alertType.includes('percent') ? `${data.targetValue}%` : formatCurrency(data.targetValue)
        }`,
        text: generateAlertEmailText(templateData),
        html: generateAlertEmailHTML(templateData),
      };

      const result = await transporter.sendMail(mailOptions);
      
      console.log(` Alert email sent to ${to} for ${data.symbol}`);
      console.log(`   Message ID: ${result.messageId}`);
      
      return true;
    } catch (error) {
      console.error(` Failed to send email to ${to}:`, error);
      return false;
    }
  },

  // Send test email (for verifying configuration)
  async sendTestEmail(to: string): Promise<boolean> {
    const transporter = createTransporter();

    if (!transporter) {
      console.error(' Email transporter not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: `Trading Platform <${GMAIL_USER}>`,
        to,
        subject: ' Trading Platform - Email Configuration Test',
        text: 'Congratulations! Your email configuration is working correctly.',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #22c55e;"> Email Configuration Successful!</h2>
            <p>Congratulations! Your Trading Platform email notifications are configured correctly.</p>
            <p>You will now receive price alerts at this email address.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">Trading Platform</p>
          </div>
        `,
      };

      const result = await transporter.sendMail(mailOptions);
      
      console.log(` Test email sent to ${to}`);
      console.log(`   Message ID: ${result.messageId}`);
      
      return true;
    } catch (error) {
      console.error(` Failed to send test email:`, error);
      return false;
    }
  },

  // Send welcome email (optional - for new users)
  async sendWelcomeEmail(to: string, firstName: string): Promise<boolean> {
    const transporter = createTransporter();

    if (!transporter) {
      return false;
    }

    try {
      const mailOptions = {
        from: `Trading Platform <${GMAIL_USER}>`,
        to,
        subject: ' Welcome to Trading Platform!',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h1 style="color: #3b82f6;">Welcome to Trading Platform!</h1>
            <p>Hi ${firstName},</p>
            <p>Thanks for joining Trading Platform. Here's what you can do:</p>
            <ul>
              <li> Track your portfolios across multiple brokers</li>
              <li> Create watchlists for stocks you're interested in</li>
              <li> Set price alerts and get notified via email</li>
              <li> View upcoming earnings calendar</li>
            </ul>
            <p>Get started by adding your first portfolio!</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/portfolio" 
               style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
              Go to Portfolio
            </a>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">Trading Platform Team</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(` Welcome email sent to ${to}`);
      return true;
    } catch (error) {
      console.error(` Failed to send welcome email:`, error);
      return false;
    }
  },
};

export default emailService;