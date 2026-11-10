import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { errorHandler } from './middleware/error.middleware.js';
import { groqService } from './integrations/ai/groq.service.js';
import { blockchainService } from './services/blockchain.service.js';

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

// Universal BigInt serialization for Prisma BigInt fields
BigInt.prototype.toJSON = function () {
  return this.toString();
};

export const app = express();

// Security Headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// Priority 8: Strict CORS configuration
const allowedOrigins = (env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile native, curl, postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development ONLY, allow local loopback origins with explicit port
      if (env.NODE_ENV === 'development' && /^http:\/\/localhost:[0-9]{2,5}$/.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS security policy`), false);
    },
    credentials: true,
  })
);

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'production' ? env.RATE_LIMIT_MAX : 5000,
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

// Multi-Subsystem Health Check (Priority 16 & Priority 8)
const handleHealthCheck = async (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
  }

  const aiStatus = groqService.getStatus();
  const bcStatus = await blockchainService.getStatus();

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'CertiTrust Backend API',
    timestamp: new Date().toISOString(),
    subsystems: {
      database: {
        status: dbStatus,
        engine: 'PostgreSQL 18',
      },
      ai: {
        status: aiStatus.isConfigured ? 'ready' : 'unconfigured',
        provider: aiStatus.provider,
        model: aiStatus.model,
      },
      blockchain: {
        status: bcStatus.status,
        isConnected: bcStatus.isConnected,
        network: bcStatus.networkName || 'Ethereum Sepolia',
        latestBlock: bcStatus.latestBlock || null,
        contractConfigured: bcStatus.contractConfigured,
      },
    },
  });
};

app.get('/health', handleHealthCheck);
app.get('/api/health', handleHealthCheck);
app.get('/api/v1/health', handleHealthCheck);

// Mount Routes
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
