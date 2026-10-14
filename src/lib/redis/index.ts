import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Singleton Redis Client with auto-reconnect strategy
let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) {
          // Fall back gracefully or retry after delay
          return null;
        }
        return Math.min(times * 100, 2000);
      },
      lazyConnect: false,
      enableOfflineQueue: true
    });

    redisInstance.on('error', (err) => {
      // Log connection error without crashing node process in dev
      if (process.env.NODE_ENV === 'production') {
        console.error('Redis connection error:', err.message);
      }
    });
  }
  return redisInstance;
}

class BoundedCache<T> {
  private map = new Map<string, { val: T; expiresAt: number }>();
  constructor(private maxSize: number = 2000) {}

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.val;
  }

  set(key: string, val: T, ttlMs: number): void {
    if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value;
      if (firstKey) this.map.delete(firstKey);
    }
    this.map.set(key, { val, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.map.delete(key);
  }
}

// Fallback in-memory stores for when Redis is unavailable (Fail-closed with strict bounded limits)
const localRateLimitCache = new BoundedCache<number>(2000);
const localAttemptsCache = new BoundedCache<number>(2000);
const localLockoutCache = new BoundedCache<number>(2000); // stores lockedUntil timestamp
const localRevokedCache = new BoundedCache<boolean>(5000);

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec?: number;
}

/**
 * Distributed sliding window rate limiter backed by Redis.
 * Uses atomic INCR and EXPIRE pipeline.
 * FAILS CLOSED: Uses bounded local fallback with a strict low limit (max 5 rpm) and alerts.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 60,
  windowSec: number = 60
): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;

  try {
    const redis = getRedisClient();
    const pipeline = redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.ttl(redisKey);
    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline returned null result');
    }

    const [errIncr, count] = results[0] as [Error | null, number];
    const [errTtl, ttl] = results[1] as [Error | null, number];

    if (errIncr) throw errIncr;

    const currentCount = Number(count) || 1;
    let currentTtl = Number(ttl);

    if (currentTtl === -1) {
      await redis.expire(redisKey, windowSec);
      currentTtl = windowSec;
    }

    if (currentCount > limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfterSec: Math.max(1, currentTtl)
      };
    }

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - currentCount)
    };
  } catch (err: any) {
    console.error(`[SECURITY_ALERT] Redis rate limit failure for key '${key}': ${err.message}. Enforcing strict bounded local fallback (fail-closed).`);

    // Strict local fallback: cap limit to strict low ceiling (min(limit, 5))
    const strictLowLimit = Math.min(limit, 5);
    const current = (localRateLimitCache.get(key) || 0) + 1;
    localRateLimitCache.set(key, current, windowSec * 1000);

    if (current > strictLowLimit) {
      return {
        allowed: false,
        limit: strictLowLimit,
        remaining: 0,
        retryAfterSec: windowSec
      };
    }

    return {
      allowed: true,
      limit: strictLowLimit,
      remaining: Math.max(0, strictLowLimit - current)
    };
  }
}

/**
 * Reset rate limit for a specific key
 */
export async function resetRateLimit(key: string): Promise<void> {
  localRateLimitCache.delete(key);
  try {
    const redis = getRedisClient();
    await redis.del(`ratelimit:${key}`);
  } catch (err: any) {
    console.warn(`[SECURITY_ALERT] Redis reset rate limit failure: ${err.message}`);
  }
}

/**
 * Login Lockout Tracking backed by Redis with Fail-Closed local fallback
 */
export async function checkLoginLockout(identifier: string): Promise<{ locked: boolean; retryAfterSec?: number }> {
  const idNorm = identifier.toLowerCase().trim();
  const lockoutKey = `lockout:${idNorm}`;

  // Check local fallback first
  const localLockedUntil = localLockoutCache.get(idNorm);
  if (localLockedUntil && Date.now() < localLockedUntil) {
    return { locked: true, retryAfterSec: Math.max(1, Math.ceil((localLockedUntil - Date.now()) / 1000)) };
  }

  try {
    const redis = getRedisClient();
    const ttl = await redis.ttl(lockoutKey);
    if (ttl > 0) {
      return { locked: true, retryAfterSec: ttl };
    }
    return { locked: false };
  } catch (err: any) {
    console.error(`[SECURITY_ALERT] Redis checkLoginLockout failed for '${idNorm}': ${err.message}. Checking bounded local lockout state.`);
    // If local cache recorded a lockout, fail closed
    if (localLockedUntil && Date.now() < localLockedUntil) {
      return { locked: true, retryAfterSec: Math.max(1, Math.ceil((localLockedUntil - Date.now()) / 1000)) };
    }
    return { locked: false };
  }
}

export async function recordFailedLogin(
  identifier: string,
  maxAttempts: number = 5,
  lockoutSec: number = 900 // 15 minutes
): Promise<{ locked: boolean; lockedUntil?: number }> {
  const idNorm = identifier.toLowerCase().trim();
  const attemptsKey = `login_attempts:${idNorm}`;
  const lockoutKey = `lockout:${idNorm}`;

  // Always update local fallback with strict threshold (3 attempts)
  const localAttempts = (localAttemptsCache.get(idNorm) || 0) + 1;
  localAttemptsCache.set(idNorm, localAttempts, lockoutSec * 1000);
  if (localAttempts >= Math.min(maxAttempts, 3)) {
    const lockedUntil = Date.now() + lockoutSec * 1000;
    localLockoutCache.set(idNorm, lockedUntil, lockoutSec * 1000);
  }

  try {
    const redis = getRedisClient();
    const attempts = await redis.incr(attemptsKey);
    if (attempts === 1) {
      await redis.expire(attemptsKey, lockoutSec);
    }

    if (attempts >= maxAttempts) {
      await redis.set(lockoutKey, '1', 'EX', lockoutSec);
      const lockedUntil = Date.now() + lockoutSec * 1000;
      localLockoutCache.set(idNorm, lockedUntil, lockoutSec * 1000);
      return {
        locked: true,
        lockedUntil
      };
    }

    if (localAttempts >= Math.min(maxAttempts, 3)) {
      return {
        locked: true,
        lockedUntil: Date.now() + lockoutSec * 1000
      };
    }

    return { locked: false };
  } catch (err: any) {
    console.error(`[SECURITY_ALERT] Redis recordFailedLogin failure for '${idNorm}': ${err.message}. Failing closed via local fallback.`);
    if (localAttempts >= Math.min(maxAttempts, 3)) {
      return {
        locked: true,
        lockedUntil: Date.now() + lockoutSec * 1000
      };
    }
    return { locked: false };
  }
}

export async function resetLoginLockout(identifier: string): Promise<void> {
  const idNorm = identifier.toLowerCase().trim();
  localAttemptsCache.delete(idNorm);
  localLockoutCache.delete(idNorm);
  try {
    const redis = getRedisClient();
    await redis.del(`login_attempts:${idNorm}`, `lockout:${idNorm}`);
  } catch (err: any) {
    console.warn(`[SECURITY_ALERT] Redis resetLoginLockout error: ${err.message}`);
  }
}

/**
 * Session Revocation backed by Redis Blacklist with Fail-Closed behavior
 */
export async function revokeSession(sessionId: string, ttlSec: number = 86400 * 7): Promise<void> {
  localRevokedCache.set(sessionId, true, ttlSec * 1000);
  const blacklistKey = `revoked_session:${sessionId}`;
  try {
    const redis = getRedisClient();
    await redis.set(blacklistKey, 'revoked', 'EX', ttlSec);
  } catch (err: any) {
    if (process.env.APP_ENV === 'production') {
      console.error('[SECURITY_ALERT] Failed to blacklist revoked session in Redis:', err.message);
    }
  }
}

export async function isSessionRevoked(sessionId: string): Promise<boolean> {
  if (localRevokedCache.get(sessionId)) return true;
  const blacklistKey = `revoked_session:${sessionId}`;
  try {
    const redis = getRedisClient();
    const res = await redis.get(blacklistKey);
    return res === 'revoked';
  } catch (err: any) {
    if (process.env.APP_ENV === 'production') {
      console.error(`[SECURITY_ALERT] Redis session check failed: ${err.message}. Failing closed in production.`);
      return true; // Fail closed in production
    }
    return false;
  }
}
