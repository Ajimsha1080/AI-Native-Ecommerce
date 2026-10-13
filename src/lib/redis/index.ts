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
      lazyConnect: true,
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

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec?: number;
}

/**
 * Distributed sliding window rate limiter backed by Redis.
 * Uses atomic INCR and EXPIRE pipeline.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 60,
  windowSec: number = 60
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const redisKey = `ratelimit:${key}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.ttl(redisKey);
    const results = await pipeline.exec();

    if (!results) {
      return { allowed: true, limit, remaining: limit - 1 };
    }

    const [errIncr, count] = results[0] as [Error | null, number];
    const [errTtl, ttl] = results[1] as [Error | null, number];

    if (errIncr) throw errIncr;

    const currentCount = Number(count) || 1;
    let currentTtl = Number(ttl);

    // If key has no expiration set yet, set expiration
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
    if (process.env.NODE_ENV === 'production') {
      console.error(`Redis rate limit error for ${key}:`, err.message);
    }
    // Fail-open fallback with warning if Redis temporarily unreachable
    return { allowed: true, limit, remaining: 1 };
  }
}

/**
 * Reset rate limit for a specific key
 */
export async function resetRateLimit(key: string): Promise<void> {
  const redis = getRedisClient();
  try {
    await redis.del(`ratelimit:${key}`);
  } catch {}
}

/**
 * Login Lockout Tracking backed by Redis
 */
export async function checkLoginLockout(identifier: string): Promise<{ locked: boolean; retryAfterSec?: number }> {
  const redis = getRedisClient();
  const lockoutKey = `lockout:${identifier.toLowerCase().trim()}`;

  try {
    const ttl = await redis.ttl(lockoutKey);
    if (ttl > 0) {
      return { locked: true, retryAfterSec: ttl };
    }
    return { locked: false };
  } catch {
    return { locked: false };
  }
}

export async function recordFailedLogin(
  identifier: string,
  maxAttempts: number = 5,
  lockoutSec: number = 900 // 15 minutes
): Promise<{ locked: boolean; lockedUntil?: number }> {
  const redis = getRedisClient();
  const idNorm = identifier.toLowerCase().trim();
  const attemptsKey = `login_attempts:${idNorm}`;
  const lockoutKey = `lockout:${idNorm}`;

  try {
    const attempts = await redis.incr(attemptsKey);
    if (attempts === 1) {
      await redis.expire(attemptsKey, lockoutSec);
    }

    if (attempts >= maxAttempts) {
      await redis.set(lockoutKey, '1', 'EX', lockoutSec);
      return {
        locked: true,
        lockedUntil: Date.now() + lockoutSec * 1000
      };
    }

    return { locked: false };
  } catch {
    return { locked: false };
  }
}

export async function resetLoginLockout(identifier: string): Promise<void> {
  const redis = getRedisClient();
  const idNorm = identifier.toLowerCase().trim();
  try {
    await redis.del(`login_attempts:${idNorm}`, `lockout:${idNorm}`);
  } catch {}
}

/**
 * Session Revocation backed by Redis Blacklist
 */
export async function revokeSession(sessionId: string, ttlSec: number = 86400 * 7): Promise<void> {
  const redis = getRedisClient();
  const blacklistKey = `revoked_session:${sessionId}`;
  try {
    await redis.set(blacklistKey, 'revoked', 'EX', ttlSec);
  } catch (err: any) {
    console.error('Failed to blacklist revoked session in Redis:', err.message);
  }
}

export async function isSessionRevoked(sessionId: string): Promise<boolean> {
  const redis = getRedisClient();
  const blacklistKey = `revoked_session:${sessionId}`;
  try {
    const res = await redis.get(blacklistKey);
    return res === 'revoked';
  } catch {
    return false;
  }
}
