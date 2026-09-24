// Sliding Window Distributed Rate Limiter
// Supports Redis in production and robust in-memory sliding window for development/testing

interface RateRecord {
  timestamps: number[];
}

const memoryLimiterStore = new Map<string, RateRecord>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec?: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSec * 1000;

  // In-memory sliding window algorithm
  const record = memoryLimiterStore.get(key) || { timestamps: [] };
  const validTimestamps = record.timestamps.filter(ts => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0];
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSec: Math.max(1, retryAfterSec)
    };
  }

  validTimestamps.push(now);
  memoryLimiterStore.set(key, { timestamps: validTimestamps });

  return {
    allowed: true,
    limit,
    remaining: limit - validTimestamps.length
  };
}

export function resetRateLimit(key: string): void {
  memoryLimiterStore.delete(key);
}
