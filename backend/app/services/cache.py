import json
import redis
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import os
import logging

logger = logging.getLogger(__name__)

class CacheService:
    """Redis-based caching service for heavy aggregations."""

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.enabled = False
        self._initialize_redis()

    def _initialize_redis(self):
        """Initialize Redis connection with fallback for development."""
        try:
            # Try to connect to Redis
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            self.redis_client = redis.from_url(redis_url, decode_responses=True)

            # Test connection
            self.redis_client.ping()
            self.enabled = True
            logger.info("Redis cache enabled")

        except (redis.ConnectionError, redis.RedisError) as e:
            logger.warning(f"Redis not available, caching disabled: {e}")
            self.enabled = False
            self.redis_client = None

    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate a consistent cache key from parameters."""
        # Sort parameters for consistent key generation
        params = {k: v for k, v in sorted(kwargs.items()) if v is not None}
        params_str = json.dumps(params, sort_keys=True, default=str)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()[:8]
        return f"pastoral_tdc:{prefix}:{params_hash}"

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get cached data."""
        if not self.enabled:
            return None

        try:
            cached_data = self.redis_client.get(key)
            if cached_data:
                data = json.loads(cached_data)
                logger.debug(f"Cache hit for key: {key}")
                return data
            logger.debug(f"Cache miss for key: {key}")
            return None
        except (redis.RedisError, json.JSONDecodeError) as e:
            logger.warning(f"Cache get error for key {key}: {e}")
            return None

    def set(self, key: str, data: Dict[str, Any], ttl_seconds: int = 300) -> bool:
        """Set cached data with TTL."""
        if not self.enabled:
            return False

        try:
            serialized_data = json.dumps(data, default=str)
            self.redis_client.setex(key, ttl_seconds, serialized_data)
            logger.debug(f"Cache set for key: {key}, TTL: {ttl_seconds}s")
            return True
        except (redis.RedisError, json.JSONDecodeError) as e:
            logger.warning(f"Cache set error for key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete a specific cache key."""
        if not self.enabled:
            return False

        try:
            result = self.redis_client.delete(key)
            logger.debug(f"Cache delete for key: {key}, result: {result}")
            return bool(result)
        except redis.RedisError as e:
            logger.warning(f"Cache delete error for key {key}: {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern."""
        if not self.enabled:
            return 0

        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                deleted = self.redis_client.delete(*keys)
                logger.info(f"Cache invalidated {deleted} keys matching pattern: {pattern}")
                return deleted
            return 0
        except redis.RedisError as e:
            logger.warning(f"Cache delete pattern error for {pattern}: {e}")
            return 0

    def invalidate_indicators(self) -> int:
        """Invalidate all indicators cache entries."""
        return self.delete_pattern("pastoral_tdc:indicators:*")

    def invalidate_data_quality(self) -> int:
        """Invalidate all data quality cache entries."""
        return self.delete_pattern("pastoral_tdc:data_quality:*")

    def invalidate_activities(self) -> int:
        """Invalidate all activities cache entries."""
        return self.delete_pattern("pastoral_tdc:activities:*")

    def invalidate_all(self) -> int:
        """Invalidate all application cache entries."""
        return self.delete_pattern("pastoral_tdc:*")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        if not self.enabled:
            return {"enabled": False, "status": "Redis not available"}

        try:
            info = self.redis_client.info()
            keys = self.redis_client.keys("pastoral_tdc:*")

            return {
                "enabled": True,
                "status": "connected",
                "total_keys": len(keys),
                "memory_used": info.get("used_memory_human", "N/A"),
                "connected_clients": info.get("connected_clients", 0),
                "uptime": info.get("uptime_in_seconds", 0)
            }
        except redis.RedisError as e:
            return {"enabled": False, "status": f"Redis error: {e}"}

# Global cache instance
cache_service = CacheService()

class CacheKeyBuilder:
    """Helper class for building consistent cache keys."""

    @staticmethod
    def indicators(audience: str = "total", **filters) -> str:
        """Build cache key for indicators endpoint."""
        return cache_service._generate_cache_key(
            "indicators",
            audience=audience,
            **filters
        )

    @staticmethod
    def data_quality_stats() -> str:
        """Build cache key for data quality stats."""
        return cache_service._generate_cache_key("data_quality", type="stats")

    @staticmethod
    def validation_errors(**filters) -> str:
        """Build cache key for validation errors."""
        return cache_service._generate_cache_key(
            "data_quality",
            type="validation_errors",
            **filters
        )

    @staticmethod
    def activities_list(**filters) -> str:
        """Build cache key for activities list."""
        return cache_service._generate_cache_key(
            "activities",
            type="list",
            **filters
        )

    @staticmethod
    def activity_registrations(activity_id: int, **filters) -> str:
        """Build cache key for activity registrations."""
        return cache_service._generate_cache_key(
            "activities",
            type="registrations",
            activity_id=activity_id,
            **filters
        )

# Convenience function for cache invalidation
def invalidate_on_data_change():
    """Invalidate relevant caches when data changes."""
    cache_service.invalidate_indicators()
    cache_service.invalidate_data_quality()
    cache_service.invalidate_activities()
    logger.info("Cache invalidated due to data change")

def cached_response(cache_key: str, ttl_seconds: int = 300):
    """Decorator for caching function responses."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Try to get from cache first
            cached_data = cache_service.get(cache_key)
            if cached_data is not None:
                return cached_data

            # Execute function and cache result
            result = await func(*args, **kwargs)
            if result is not None:
                cache_service.set(cache_key, result, ttl_seconds)

            return result
        return wrapper
    return decorator