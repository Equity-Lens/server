import express from 'express';
import newsController from '../../controllers/newsController';

const router = express.Router();

// Query params: category (general, forex, crypto, merger)
router.get('/market', newsController.getMarketNews);

// Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
router.get('/company/:symbol', newsController.getCompanyNews);

export default router;