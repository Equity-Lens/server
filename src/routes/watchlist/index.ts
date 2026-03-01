import express from 'express';
import watchlistController from '../../controllers/watchlistController';
import { authenticateToken } from '../../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get user's watchlist
router.get('/', watchlistController.getWatchlist);

// Add stock to watchlist
router.post('/', watchlistController.addStock);

// Remove stock from watchlist
router.delete('/:symbol', watchlistController.removeStock);

// Update watchlist item (notes, alert price)
router.patch('/:symbol', watchlistController.updateStock);

export default router;