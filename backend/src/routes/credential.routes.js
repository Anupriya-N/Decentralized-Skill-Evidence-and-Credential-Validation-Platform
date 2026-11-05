import { Router } from 'express';
import { credentialController } from '../controllers/credential.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticate, authorize('INSTITUTION', 'ADMIN'), (req, res, next) =>
  credentialController.issue(req, res, next)
);

router.get('/my', authenticate, (req, res, next) =>
  credentialController.getMyCredentials(req, res, next)
);

router.post('/:id/revoke', authenticate, authorize('INSTITUTION', 'ADMIN'), (req, res, next) =>
  credentialController.revoke(req, res, next)
);

router.post('/:id/reconcile-revocation', authenticate, authorize('INSTITUTION', 'ADMIN'), (req, res, next) =>
  credentialController.reconcileRevocation(req, res, next)
);

router.get('/qr/:id', (req, res, next) =>
  credentialController.getQrCode(req, res, next)
);

router.get('/:id', (req, res, next) =>
  credentialController.getById(req, res, next)
);

export default router;
