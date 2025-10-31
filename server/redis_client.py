import redis.asyncio as redis
import json
from typing import Optional, Any
from config import settings

# Redis configuration
REDIS_URL = settings.REDIS_URL

# Global Redis client
redis_client: Optional[redis.Redis] = None

# Initialize Redis client
async def get_redis_client():
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(
            REDIS_URL,
            password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
            db=settings.REDIS_DB,
            decode_responses=True
        )
    return redis_client

# Test Redis connection
async def test_redis_connection():
    try:
        client = await get_redis_client()
        await client.ping()
        print("✅ Redis connection successful!")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False

# Redis utility functions
class RedisService:
    def __init__(self):
        self._client = None
    
    async def get_client(self):
        if self._client is None:
            self._client = await get_redis_client()
        return self._client
    
    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """Set a key-value pair in Redis"""
        try:
            client = await self.get_client()
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            return await client.set(key, value, ex=expire)
        except Exception as e:
            print(f"Redis set error: {e}")
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get a value from Redis"""
        try:
            client = await self.get_client()
            value = await client.get(key)
            if value is None:
                return None
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        except Exception as e:
            print(f"Redis get error: {e}")
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
