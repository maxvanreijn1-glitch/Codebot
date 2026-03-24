import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = res.locals['requestId'] as string | undefined;
  const userId = (req as { user?: { id: string } }).user?.id;

  // Log full error details server-side
  logger.error('unhandled_error', {
    requestId,
    userId,
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    statusCode: err.statusCode,
  });

  // Operational errors: known, expected errors with a user-facing message
  if (err.isOperational && err.statusCode) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(requestId ? { requestId } : {}),
    });
    return;
  }

  // Unknown errors: return a generic message, never expose internals
  res.status(500).json({
    error: 'Internal server error',
    ...(requestId ? { requestId } : {}),
  });
}

export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}
