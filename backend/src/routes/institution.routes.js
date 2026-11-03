import { Router } from 'express';
import { institutionController } from '../controllers/institution.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('INSTITUTION', 'ADMIN'));

router.get('/dashboard', (req, res, next) => institutionController.getDashboard(req, res, next));
router.get('/credentials', (req, res, next) => institutionController.getIssuedCredentials(req, res, next));
router.post('/credentials/batch', (req, res, next) => institutionController.batchIssue(req, res, next));
router.get('/evidence/pending', (req, res, next) => institutionController.getPendingEvidence(req, res, next));

export default router;
