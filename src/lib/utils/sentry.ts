import { logError } from './logger';

export function captureException(error: any, context: Record<string, any> = {}) {
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    // If Sentry SDK is initialized in production
    // (e.g. Sentry.captureException(error, { extra: context }))
  }
  logError(`Captured Exception: ${error?.message || error}`, error, context);
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context: Record<string, any> = {}) {
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    // Sentry.captureMessage(message, level)
  }
  logError(`Captured Message [${level}]: ${message}`, null, context);
}
