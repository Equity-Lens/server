import { Router } from "express";

const router = Router();

router.get('/', (req, res) => {
    res.json({
        message: 'Server is running',
        status: 'success',
        timestamp: new Date().toISOString(),
    })
});

export default router;