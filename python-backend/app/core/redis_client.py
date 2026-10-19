import time
import logging
from typing import Tuple, Optional, Dict
import redis.asyncio as aioredis
from .config import settings

logger = logging.getLogger("redis_client")

# Async Redis singleton
_redis_pool: Optional[aioredis.Redis] = None

def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50
        )
    return _redis_pool

# In-memory bounded fallback cache
_local_rate_limit: Dict[str, Tuple[int, float]] = {}
_local_lockout: Dict[str, float] = {}
_local_attempts: Dict[str, int] = {}
_local_revoked: Dict[str, float] = {}

async def check_rate_limit(
    key: str,
    limit: int = 60,
    window_sec: int = 60
) -> Tuple[bool, int, int]:
    """
    Distributed sliding window rate limiter.
    Returns (allowed, remaining, retry_after_sec).
    """
    redis_key = f"ratelimit:{key}"
    try:
        r = get_redis()
        pipe = r.pipeline()
        pipe.incr(redis_key)
        pipe.ttl(redis_key)
        count, ttl = await pipe.execute()

        current_count = int(count)
        current_ttl = int(ttl)

        if current_ttl == -1:
            await r.expire(redis_key, window_sec)
            current_ttl = window_sec

        if current_count > limit:
            return False, 0, max(1, current_ttl)

        return True, max(0, limit - current_count), 0
    except Exception as e:
        logger.warning(f"Redis rate limit fallback for {key}: {e}")
        # Bounded in-memory fallback
        now = time.time()
        count, expires_at = _local_rate_limit.get(key, (0, now + window_sec))
        if now > expires_at:
            count = 0
            expires_at = now + window_sec
        count += 1
        _local_rate_limit[key] = (count, expires_at)
        strict_limit = min(limit, 5)
        if count > strict_limit:
            return False, 0, int(expires_at - now)
        return True, max(0, strict_limit - count), 0

async def check_login_lockout(identifier: str) -> Tuple[bool, int]:
    """Checks if an account/identifier is currently locked out."""
    norm_id = identifier.lower().strip()
    lockout_key = f"lockout:{norm_id}"
    try:
        r = get_redis()
        ttl = await r.ttl(lockout_key)
        if ttl > 0:
            return True, ttl
        return False, 0
    except Exception as e:
        now = time.time()
        locked_until = _local_lockout.get(norm_id, 0)
        if now < locked_until:
            return True, int(locked_until - now)
        return False, 0

async def record_failed_login(
    identifier: str,
    max_attempts: int = 5,
    lockout_seconds: int = 900
) -> Tuple[bool, int]:
    """Records a failed login attempt and locks account if threshold exceeded."""
    norm_id = identifier.lower().strip()
    attempts_key = f"login_attempts:{norm_id}"
    lockout_key = f"lockout:{norm_id}"
    try:
        r = get_redis()
        attempts = await r.incr(attempts_key)
        if attempts == 1:
            await r.expire(attempts_key, lockout_seconds)

        if attempts >= max_attempts:
            await r.set(lockout_key, "1", ex=lockout_seconds)
            await r.delete(attempts_key)
            return True, lockout_seconds
        return False, 0
    except Exception as e:
        attempts = _local_attempts.get(norm_id, 0) + 1
        _local_attempts[norm_id] = attempts
        if attempts >= max_attempts:
            _local_lockout[norm_id] = time.time() + lockout_seconds
            _local_attempts[norm_id] = 0
            return True, lockout_seconds
        return False, 0

async def reset_login_lockout(identifier: str) -> None:
    """Resets failed login attempts upon successful authentication."""
    norm_id = identifier.lower().strip()
    try:
        r = get_redis()
        await r.delete(f"login_attempts:{norm_id}")
        await r.delete(f"lockout:{norm_id}")
    except Exception:
        _local_attempts.pop(norm_id, None)
        _local_lockout.pop(norm_id, None)

async def revoke_session(session_id: str, ttl_sec: int = 86400 * 7) -> None:
    """Blacklists a revoked session token."""
    try:
        r = get_redis()
        await r.set(f"revoked_session:{session_id}", "1", ex=ttl_sec)
    except Exception:
        _local_revoked[session_id] = time.time() + ttl_sec

async def is_session_revoked(session_id: str) -> bool:
    """Checks if a session token has been revoked."""
    try:
        r = get_redis()
        val = await r.get(f"revoked_session:{session_id}")
        return val is not None
    except Exception:
        expires = _local_revoked.get(session_id, 0)
        return time.time() < expires
