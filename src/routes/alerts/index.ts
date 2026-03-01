import express from 'express';
import alertController from '../../controllers/alertController';
import { authenticateToken } from '../../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get all alerts for user
router.get('/', alertController.getAlerts);

// Get active alerts only
router.get('/active', alertController.getActiveAlerts);

// Get triggered alerts (notification history)
router.get('/triggered', alertController.getTriggeredAlerts);

// Get alerts summary (counts)
router.get('/summary', alertController.getAlertsSummary);

// Create new alert
router.post('/', alertController.createAlert);

// Get single alert
router.get('/:id', alertController.getAlert);

// Update alert
router.patch('/:id', alertController.updateAlert);

// Delete alert
router.delete('/:id', alertController.deleteAlert);

// Reset a triggered alert (make active again)
router.post('/:id/reset', alertController.resetAlert);

// Activate a paused alert
router.post('/:id/activate', alertController.activateAlert);

// Deactivate (pause) an alert
router.post('/:id/deactivate', alertController.deactivateAlert);

// Test email configuration
router.post('/test-email', alertController.testEmail);

// Manually check all alerts (for debugging)
router.post('/check', alertController.checkAllAlerts);

export default router;