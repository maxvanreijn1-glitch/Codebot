import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  userId?: string;
  event: string;
  [key: string]: unknown;
}

function log(level: LogLevel, event: string, context: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  };
  const output = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

export const logger = {
  info: (event: string, context?: Record<string, unknown>) => log('info', event, context),
  warn: (event: string, context?: Record<string, unknown>) => log('warn', event, context),
  error: (event: string, context?: Record<string, unknown>) => log('error', event, context),
  debug: (event: string, context?: Record<string, unknown>) => {
    if (process.env.LOG_LEVEL === 'debug') {
      log('debug', event, context);
    }
  },
};

// Middleware to attach requestId and log each request
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  res.locals['requestId'] = requestId;

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = (req as { user?: { id: string } }).user?.id;
    logger.info('http_request', {
      requestId,
      userId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
    });
  });

  next();
}
