import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import prisma from './prisma/client';
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

dotenv.config();

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET'];

function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !isProduction) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin not allowed'));
  },
  credentials: true,
}));

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// API Routes
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React client in production
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');

if (isProduction) {
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
  } else {
    console.warn('Client dist folder not found at:', clientDistPath);
  }
}

// SPA fallback - MUST be before error handler, AFTER API routes and static files
if (isProduction) {
  if (fs.existsSync(clientIndexPath)) {
    app.get('*', (_req, res) => {
      res.sendFile(clientIndexPath);
    });
  } else {
    console.warn('Client index.html not found at:', clientIndexPath);
  }
}

// Error handler - MUST be last
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function start(): Promise<void> {
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
  } catch (err) {
    console.warn('Prisma migrate deploy skipped or failed');
  }

  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await prisma.$disconnect();
      } catch (err) {
        console.error('Error disconnecting database:', err);
      }
      process.exit(0);
    });

    setTimeout(() => {
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();

export default app;
