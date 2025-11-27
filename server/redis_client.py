import redis.asyncio as redis
import json
import asyncio
from typing import Optional, Any
from config import settings

# Redis configuration - using meaningful names from settings
REDIS_CONNECTION_URL = settings.REDIS_CONNECTION_URL

# Global Redis client
redis_client: Optional[redis.Redis] = None

# Initialize Redis client with optimized configuration for chunk-based caching
async def get_redis_client():
    """Initialize and return Redis client connection with graceful degradation"""
    global redis_client
    if redis_client is None:
        try:
            redis_client = redis.from_url(
                REDIS_CONNECTION_URL,
                password=settings.REDIS_AUTH_PASSWORD if settings.REDIS_AUTH_PASSWORD else None,
                db=settings.REDIS_DATABASE_NUMBER,
                decode_responses=True,
                socket_connect_timeout=1,  # Reduced from 5 to fail faster
                socket_timeout=1,  # Add socket timeout to prevent hanging
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30,
                retry_on_timeout=False,  # Disable retries to fail fast
                max_connections=50
            )
            # Test connection immediately
            await asyncio.wait_for(redis_client.ping(), timeout=1)
        except Exception as e:
            print(f"⚠️  Redis not available: {e}. Continuing without cache.")
            redis_client = None
    return redis_client

# Test Redis connection
async def test_redis_connection():
    try:
        client = await get_redis_client()
        if client is None:
            print("⚠️  Redis not available (optional)")
            return False
        await client.ping()
        print("✅ Redis connection successful!")
        return True
    except Exception as e:
        print(f"⚠️  Redis not available: {e}")
        return False

# Redis utility functions
class RedisService:
    def __init__(self):
        self._client = None
    
    async def get_client(self):
        """Get Redis client, return None if Redis is not available"""
        if self._client is None:
            self._client = await get_redis_client()
        return self._client
    
    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """Set a key-value pair in Redis with graceful failure"""
        try:
            client = await self.get_client()
            if client is None:
                return False  # Redis not available, skip caching
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            return await client.set(key, value, ex=expire)
        except Exception as e:
            # Log but don't fail - skip caching
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get a value from Redis with graceful failure"""
        try:
            client = await self.get_client()
            if client is None:
                return None  # Redis not available, treat as cache miss
            value = await client.get(key)
            if value is None:
                return None
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        except Exception as e:
            # Log but don't fail - treat as cache miss
            return None
    
    async def delete(self, key: str) -> bool:
        """Delete a key from Redis"""
        try:
            client = await self.get_client()
            return bool(await client.delete(key))
        except Exception as e:
            print(f"Redis delete error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if a key exists in Redis"""
        try:
            client = await self.get_client()
            return bool(await client.exists(key))
        except Exception as e:
            print(f"Redis exists error: {e}")
            return False

# Global Redis service instance
redis_service = RedisService()
