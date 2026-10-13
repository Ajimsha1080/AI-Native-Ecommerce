import { logError, logInfo } from './logger';

interface SentryDsnComponents {
  publicKey: string;
  host: string;
  projectId: string;
}

function parseSentryDsn(dsn?: string): SentryDsnComponents | null {
  if (!dsn || dsn.includes('placeholder') || dsn.includes('example.com')) return null;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const pathParts = url.pathname.split('/').filter(Boolean);
    const projectId = pathParts[pathParts.length - 1];

    if (!publicKey || !host || !projectId) return null;
    return { publicKey, host, projectId };
  } catch {
    return null;
  }
}

async function sendToSentry(payload: Record<string, any>): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  const parsed = parseSentryDsn(dsn);
  if (!parsed) return;

  const endpoint = `https://${parsed.host}/api/${parsed.projectId}/store/`;
  const sentryAuth = `Sentry sentry_version=7, sentry_client=shopmate-aaas/1.0.0, sentry_key=${parsed.publicKey}`;

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': sentryAuth
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });
  } catch (err: any) {
    // Fail silently to avoid crash loops during error reporting
  }
}

export function captureException(error: any, context: Record<string, any> = {}) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errStack = error instanceof Error ? error.stack : undefined;

  const event = {
    event_id: Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level: 'error',
    exception: {
      values: [
        {
          type: error?.name || 'Error',
          value: errMessage,
          stacktrace: errStack ? { frames: [{ filename: 'server', function: 'execute' }] } : undefined
        }
      ]
    },
    extra: context,
    environment: process.env.NODE_ENV || 'production'
  };

  sendToSentry(event).catch(() => {});
  logError(`Captured Exception: ${errMessage}`, error, context);
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context: Record<string, any> = {}) {
  const event = {
    event_id: Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level,
    message: { formatted: message },
    extra: context,
    environment: process.env.NODE_ENV || 'production'
  };

  sendToSentry(event).catch(() => {});
  if (level === 'error') {
    logError(`Captured Message [${level}]: ${message}`, null, context);
  } else {
    logInfo(`Captured Message [${level}]: ${message}`, context);
  }
}
