import { Router } from 'express';
import { verificationController } from '../controllers/verification.controller.js';
import { upload } from '../config/multer.js';

const router = Router();

// Public 6-point verification by certificate number, ID, or hash
router.get('/verify/:identifier', (req, res, next) =>
  verificationController.verifyCredential(req, res, next)
);

// Verify by file re-hash
router.post('/verify-document', upload.single('file'), (req, res, next) =>
  verificationController.verifyDocument(req, res, next)
);

export default router;
