import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/extract-skills', (req, res, next) => aiController.extractSkills(req, res, next));
router.post('/gap-analysis', (req, res, next) => aiController.analyzeGap(req, res, next));
router.post('/chat', (req, res, next) => aiController.chat(req, res, next));

export default router;
