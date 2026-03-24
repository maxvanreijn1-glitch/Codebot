import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import repositoryRoutes from './routes/repositories';
import analysisRoutes from './routes/analysis';
import paymentRoutes from './routes/payments';
import userRoutes from './routes/user';
import claudeAnalysisRoutes from './routes/claude-analysis';
import localReposRoutes from './routes/local-repos';
import pullRequestsRoutes from './routes/pull-requests';
import commandsRoutes from './routes/commands';
import copilotRoutes from './routes/copilot';
import arduinoRoutes from './routes/arduino';
import generateRoutes from './routes/generateRoutes';
import stripeRoutes from './routes/stripeRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger, logger } from './utils/logger';
import { registerGlobalAlertHandlers, alertDatabaseError } from './utils/alerting';
import { pool } from './db';

dotenv.config();

registerGlobalAlertHandlers();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!isProduction) return callback(null, true);
    const productionOrigins = ['https://codebot-ktjb.onrender.com', ...allowedOrigins];
    if (productionOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Structured request logging
app.use(requestLogger);

// IP-based fallback rate limit (protects unauthenticated routes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/repositories', repositoryRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/claude', claudeAnalysisRoutes);
app.use('/api/repos', localReposRoutes);
app.use('/api/pull-requests', pullRequestsRoutes);
app.use('/api/commands', commandsRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/arduino', arduinoRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/stripe', stripeRoutes);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
    });
  } catch (err) {
    logger.error('health_check_db_error', { message: (err as Error).message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// Serve React frontend in production
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');

if (isProduction && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// SPA fallback
if (isProduction && fs.existsSync(clientIndexPath)) {
  app.get('*', (_req, res) => {
    res.sendFile(clientIndexPath);
  });
}

// Global error handler — must be last
app.use(errorHandler);

// Forward database pool errors to alerting
pool.on('error', (err: Error) => {
  alertDatabaseError(err);
});

app.listen(PORT, () => {
  logger.info('server_started', { port: PORT, env: process.env.NODE_ENV || 'development' });
});

export default app;