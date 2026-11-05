import { Router } from 'express';
import { verificationController } from '../controllers/verification.controller.js';
import { upload } from '../config/multer.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Public verification rate limiter (defense against brute force & enumeration)
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification requests from this IP, please try again after 15 minutes.',
  },
});

// Public 6-point verification by certificate number, ID, or hash
router.get('/verify/:identifier', verificationLimiter, (req, res, next) =>
  verificationController.verifyCredential(req, res, next)
);

// Verify by file re-hash
router.post('/verify-document', verificationLimiter, upload.single('file'), (req, res, next) =>
  verificationController.verifyDocument(req, res, next)
);

export default router;
