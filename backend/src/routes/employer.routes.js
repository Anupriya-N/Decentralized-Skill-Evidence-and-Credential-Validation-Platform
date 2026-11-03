import { Router } from 'express';
import { employerController } from '../controllers/employer.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('EMPLOYER', 'ADMIN'));

router.get('/dashboard', (req, res, next) => employerController.getDashboard(req, res, next));
router.get('/candidates', (req, res, next) => employerController.searchCandidates(req, res, next));
router.get('/candidates/:id', (req, res, next) => employerController.getCandidate(req, res, next));

export default router;
