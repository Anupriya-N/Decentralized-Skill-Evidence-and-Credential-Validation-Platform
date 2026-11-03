import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/dashboard', (req, res, next) => adminController.getDashboard(req, res, next));
router.get('/users', (req, res, next) => adminController.getUsers(req, res, next));
router.patch('/institutions/:id/accreditation', (req, res, next) =>
  adminController.updateAccreditation(req, res, next)
);
router.get('/audit-logs', (req, res, next) => adminController.getAuditLogs(req, res, next));

export default router;
