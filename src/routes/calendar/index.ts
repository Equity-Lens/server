import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../../middleware/auth';
import * as calendarController from '../../controllers/calendarController';

const router = Router();

router.get('/earnings', calendarController.getEarningsCalendar);

router.get('/earnings/symbol/:symbol', calendarController.getEarningsForSymbol);

router.get('/earnings/upcoming', calendarController.getUpcomingEarnings);

router.post('/earnings/clear-cache', calendarController.clearEarningsCache);

export default router;