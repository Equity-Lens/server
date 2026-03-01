import express from 'express';
import portfolioController from '../../controllers/portfolioController';
import { authenticateToken } from '../../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get all portfolios for user
router.get('/', portfolioController.getPortfolios);

// Create new portfolio
router.post('/', portfolioController.createPortfolio);

// Get single portfolio
router.get('/:id', portfolioController.getPortfolio);

// Update portfolio
router.patch('/:id', portfolioController.updatePortfolio);

// Delete portfolio
router.delete('/:id', portfolioController.deletePortfolio);

// Set portfolio as default
router.post('/:id/default', portfolioController.setDefaultPortfolio);

// Get portfolio holdings with live prices
router.get('/:id/holdings', portfolioController.getHoldings);

// Add holding to portfolio
router.post('/:id/holdings', portfolioController.addHolding);

// Update holding
router.patch('/:id/holdings/:symbol', portfolioController.updateHolding);

// Remove holding from portfolio
router.delete('/:id/holdings/:symbol', portfolioController.removeHolding);

export default router;