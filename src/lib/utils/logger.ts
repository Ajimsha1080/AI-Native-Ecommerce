import crypto from 'crypto';

export interface LogContext {
  requestId?: string;
  traceId?: string;
  workspaceId?: string;
  userId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: any;
}

export function generateRequestId(): string {
  return `req_${crypto.randomBytes(8).toString('hex')}`;
}

export function logInfo(message: string, context: LogContext = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message,
    ...context
  };
  console.log(JSON.stringify(entry));
}

export function logWarn(message: string, context: LogContext = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'WARN',
    message,
    ...context
  };
  console.warn(JSON.stringify(entry));
}

export function logError(message: string, error?: any, context: LogContext = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message,
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    ...context
  };
  console.error(JSON.stringify(entry));
}
