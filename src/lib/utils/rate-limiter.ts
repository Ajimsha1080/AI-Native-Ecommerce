interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitOptions {
  limit?: number;        // Max burst tokens
  intervalMs?: number;   // Refill window in ms
}

/**
 * Sliding-window token bucket rate limiter.
 * Suitable for multi-tenant SaaS endpoints and API key burst management.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { allowed: boolean; remaining: number; resetMs: number } {
  const limit = options.limit || 60; // 60 requests
  const intervalMs = options.intervalMs || 60000; // per 1 minute
  const now = Date.now();

  let bucket = buckets.get(identifier);
  if (!bucket) {
    bucket = { tokens: limit, lastRefill: now };
    buckets.set(identifier, bucket);
  }

  // Calculate elapsed refill
  const elapsed = now - bucket.lastRefill;
  const refillRate = limit / intervalMs;
  const tokensToAdd = elapsed * refillRate;

  bucket.tokens = Math.min(limit, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetMs: Math.ceil((limit - bucket.tokens) / refillRate)
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetMs: Math.ceil((1 - bucket.tokens) / refillRate)
  };
}

/** Periodic cleanup for stale buckets to prevent memory leaks */
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets.entries()) {
    if (now - b.lastRefill > 300000) { // 5 minutes stale
      buckets.delete(key);
    }
  }
}, 60000).unref?.();
