"""Utility script to clear all Redis caches"""
import asyncio
from redis_client import get_redis_client

async def clear_all_cache():
    """Clear all cache entries from Redis"""
    try:
        client = await get_redis_client()
        
        # Get all keys matching common cache patterns (including paginated chunk-based keys)
        patterns = [
            "staff:*",
            "students:*",
            "teachers:*",
            "parents:*",
            "expense:*",
            "fees:*",
            "fee-management:*",
            "testmarks:*",
            "exam:*",
            "attendance:*",
            "classes:*",
            "subjects:*",
            "fee-types:*",
            "fee-invoices:*",
            "fee-details:*",
            "academic-years:*",
            "class-teachers:*",
        ]
        
        total_deleted = 0
        for pattern in patterns:
            # Use SCAN to find all matching keys
            cursor = 0
            while True:
                cursor, keys = await client.scan(cursor, match=pattern, count=1000)
                if keys:
                    deleted = await client.delete(*keys)
                    total_deleted += deleted
                if cursor == 0:
                    break
        
        print(f"✅ Cleared {total_deleted} cache entries")
        return total_deleted
    except Exception as e:
        print(f"❌ Error clearing cache: {e}")
        return 0

async def clear_cache_by_pattern(pattern: str):
    """Clear cache entries matching a specific pattern"""
    try:
        client = await get_redis_client()
        cursor = 0
        total_deleted = 0
        
        while True:
            cursor, keys = await client.scan(cursor, match=pattern, count=1000)
            if keys:
                deleted = await client.delete(*keys)
                total_deleted += deleted
            if cursor == 0:
                break
        
        print(f"✅ Cleared {total_deleted} cache entries matching pattern: {pattern}")
        return total_deleted
    except Exception as e:
        print(f"❌ Error clearing cache: {e}")
        return 0

if __name__ == "__main__":
    asyncio.run(clear_all_cache())

