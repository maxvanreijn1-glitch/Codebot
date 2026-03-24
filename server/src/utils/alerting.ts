import { logger } from './logger';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

interface AlertContext {
  severity: AlertSeverity;
  [key: string]: unknown;
}

/**
 * Emit a structured alert to stdout/stderr for ingestion by container orchestration
 * (Kubernetes, Docker Compose, etc.) or log aggregators (Datadog, New Relic, etc.).
 */
export function alert(event: string, context: AlertContext): void {
  logger.error(`ALERT_${event.toUpperCase()}`, {
    alert: true,
    ...context,
  });
}

/**
 * Register global process-level handlers for unhandled errors.
 * Call once at application startup.
 */
export function registerGlobalAlertHandlers(): void {
  process.on('uncaughtException', (err: Error) => {
    alert('uncaught_exception', {
      severity: 'critical',
      message: err.message,
      stack: err.stack,
    });
    // Allow time for the log to flush before exiting
    setTimeout(() => process.exit(1), 500);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    alert('unhandled_rejection', {
      severity: 'critical',
      message,
      stack,
    });
  });
}

/**
 * Emit a database connectivity alert.
 */
export function alertDatabaseError(err: Error): void {
  alert('database_error', {
    severity: 'critical',
    message: err.message,
  });
}

/**
 * Emit a high error-rate alert (called when error rate spikes above threshold).
 */
export function alertHighErrorRate(errorCount: number, windowMs: number): void {
  alert('high_error_rate', {
    severity: 'high',
    errorCount,
    windowMs,
  });
}
