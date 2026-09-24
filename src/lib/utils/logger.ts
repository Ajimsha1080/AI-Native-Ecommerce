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
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return `req_${globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
  }
  return `req_${Math.random().toString(36).substring(2, 15)}`;
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
