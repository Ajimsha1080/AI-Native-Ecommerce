// Distributed Rate Limiter backed by Redis (ioredis)
// Deletes in-memory store and enforces distributed state
import { checkRateLimit as redisCheckRateLimit, resetRateLimit as redisResetRateLimit, RateLimitResult } from '../redis';

export type { RateLimitResult };

export async function checkRateLimit(
  key: string,
  limit: number = 60,
  windowSec: number = 60
): Promise<RateLimitResult> {
  return await redisCheckRateLimit(key, limit, windowSec);
}

export async function resetRateLimit(key: string): Promise<void> {
  await redisResetRateLimit(key);
}
