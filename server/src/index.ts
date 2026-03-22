import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
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

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Stripe webhook needs raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
