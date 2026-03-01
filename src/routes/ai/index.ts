import { Router } from 'express';
import { chatWithAI } from '../../controllers/aiController';

const router = Router();

router.post('/chat', chatWithAI);

export default router;