import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import institutionRoutes from './routes/institution.routes.js';
import employerRoutes from './routes/employer.routes.js';
import skillsRoutes from './routes/skills.routes.js';
import evidenceRoutes from './routes/evidence.routes.js';
import credentialRoutes from './routes/credential.routes.js';
import verificationRoutes from './routes/verification.routes.js';
import aiRoutes from './routes/ai.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Universal BigInt serialization for Prisma BigInt fields
BigInt.prototype.toJSON = function () {
  return this.toString();
};

export const app = express();

// Security Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any localhost origin during development or frontend URL
      if (!origin || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Request Parsing & Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CertiTrust Backend API (JavaScript)',
  });
});

// Mount Routes (supporting both /api/v1 and /api for maximum frontend compatibility)
const apiRouters = [
  { path: '/auth', router: authRoutes },
  { path: '/students', router: studentRoutes },
  { path: '/institutions', router: institutionRoutes },
  { path: '/employers', router: employerRoutes },
  { path: '/skills', router: skillsRoutes },
  { path: '/evidence', router: evidenceRoutes },
  { path: '/credentials', router: credentialRoutes },
  { path: '/verification', router: verificationRoutes },
  { path: '/ai', router: aiRoutes },
  { path: '/admin', router: adminRoutes },
  { path: '/notifications', router: notificationRoutes },
];

apiRouters.forEach(({ path: routePath, router }) => {
  app.use(`/api/v1${routePath}`, router);
  app.use(`/api${routePath}`, router);
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found on CertiTrust API`,
  });
});

// Centralized Error Handler
app.use(errorHandler);
