import { Router } from 'express';
import { studentController } from '../controllers/student.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/dashboard', authenticate, authorize('STUDENT', 'ADMIN'), (req, res, next) =>
  studentController.getDashboard(req, res, next)
);

router.get('/skills', authenticate, (req, res, next) =>
  studentController.getSkills(req, res, next)
);

router.patch('/profile', authenticate, authorize('STUDENT'), (req, res, next) =>
  studentController.updateProfile(req, res, next)
);

// Public portfolio access
router.get('/portfolio/:identifier', (req, res, next) =>
  studentController.getPublicPortfolio(req, res, next)
);

export default router;
