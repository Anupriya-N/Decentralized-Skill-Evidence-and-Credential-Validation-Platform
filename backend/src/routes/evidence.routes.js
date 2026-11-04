import { Router } from 'express';
import { evidenceController } from '../controllers/evidence.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { upload } from '../config/multer.js';

const router = Router();

router.use(authenticate);

router.post('/upload', upload.single('file'), (req, res, next) =>
  evidenceController.upload(req, res, next)
);

router.get('/my', authorize('STUDENT', 'ADMIN'), (req, res, next) =>
  evidenceController.getMyEvidence(req, res, next)
);

// Authenticated, protected evidence download
router.get('/:id/download', (req, res, next) =>
  evidenceController.downloadEvidence(req, res, next)
);

router.patch('/:id/review', authorize('INSTITUTION', 'ADMIN'), (req, res, next) =>
  evidenceController.review(req, res, next)
);

export default router;
