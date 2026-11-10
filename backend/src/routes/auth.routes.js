import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';

const router = Router();

// Strict login brute-force limiter (max 10 attempts per 15 minutes in production)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes before trying again.' },
});

// Strict password reset rate limiter (max 5 attempts per 15 minutes in production)
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 5 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset attempts. Please wait 15 minutes.' },
});

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.string().optional().default('STUDENT'),
    institutionName: z.string().optional(),
    companyName: z.string().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    resetToken: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }),
});

router.post('/register', validateRequest(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post('/login', loginLimiter, validateRequest(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/refresh-token', validateRequest(refreshSchema), (req, res, next) => authController.refreshToken(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validateRequest(forgotPasswordSchema),
  (req, res, next) => authController.forgotPassword(req, res, next)
);

router.post(
  '/reset-password',
  passwordResetLimiter,
  validateRequest(resetPasswordSchema),
  (req, res, next) => authController.resetPassword(req, res, next)
);

router.post(
  '/change-password',
  authenticate,
  validateRequest(changePasswordSchema),
  (req, res, next) => authController.changePassword(req, res, next)
);

export default router;
