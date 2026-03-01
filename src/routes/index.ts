import { Router } from "express";
import testRoutes from './test/index'
// import stocksRoutes from './stocks/index'
import authRoutes from './auth';
import aiRoutes from './ai';
import calendarRoutes from './calendar';
import watchlistRoutes from './watchlist';
import portfolioRoutes from './portfolio';
import alertRoutes from './alerts';
import newsRoutes from './news';
import stockServiceRoutes from './stockService'

const router = Router();

router.use('/test', testRoutes);
router.use('/auth', authRoutes);
// router.use('/stocks/search', stocksRoutes);
router.use('/ai', aiRoutes);
router.use('/calendar', calendarRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/alerts', alertRoutes);
router.use('/news', newsRoutes);
router.use('/stock', stockServiceRoutes);


export default router;
