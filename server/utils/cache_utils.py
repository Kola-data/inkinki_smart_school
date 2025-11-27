"""Cache utilities for paginated data with chunk-based caching"""
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
from redis_client import redis_service
from config import settings
import json

async def get_paginated_cache(
    base_key: str,
    page: int,
    page_size: int,
    filters: Optional[Dict[str, Any]] = None
) -> Optional[Tuple[List[Any], int]]:
    """
    Get paginated data from cache with chunk-based strategy.
    
    Args:
        base_key: Base cache key (e.g., "staff:school:{school_id}")
        page: Page number (1-indexed)
        page_size: Items per page
        filters: Optional filter parameters for cache key
    
    Returns:
        Tuple of (items, total) if cached, None otherwise
    """
    # Build cache key with pagination and filters
    cache_key = f"{base_key}"
    if filters:
        filter_str = ":".join(f"{k}:{v}" for k, v in sorted(filters.items()) if v is not None)
        if filter_str:
            cache_key += f":{filter_str}"
    cache_key += f":page:{page}:size:{page_size}"
    
    cached_data = await redis_service.get(cache_key)
    if cached_data and isinstance(cached_data, dict):
        return cached_data.get('items', []), cached_data.get('total', 0)
    
    return None

async def set_paginated_cache(
    base_key: str,
    page: int,
    page_size: int,
    items: List[Any],
    total: int,
    filters: Optional[Dict[str, Any]] = None,
    expire: Optional[int] = None
):
    """
    Cache paginated data with chunk-based strategy.
    
    Args:
        base_key: Base cache key
        page: Page number
        page_size: Items per page
        items: Items to cache
        total: Total count
        filters: Optional filter parameters
        expire: Cache expiration in seconds (defaults to settings.REDIS_CACHE_TTL)
    """
    cache_key = f"{base_key}"
    if filters:
        filter_str = ":".join(f"{k}:{v}" for k, v in sorted(filters.items()) if v is not None)
        if filter_str:
            cache_key += f":{filter_str}"
    cache_key += f":page:{page}:size:{page_size}"
    
    cache_data = {
        'items': items,
        'total': total,
        'page': page,
        'page_size': page_size
    }
    
    expire_time = expire or settings.REDIS_CACHE_TTL
    await redis_service.set(cache_key, cache_data, expire=expire_time)

async def clear_paginated_cache_pattern(base_key: str, filters: Optional[Dict[str, Any]] = None):
    """
    Clear all paginated cache entries for a base key pattern.
    Note: This is a simplified version. In production, you might want to use Redis SCAN
    to find and delete all matching keys.
    
    Args:
        base_key: Base cache key pattern
        filters: Optional filter parameters
    """
    # For now, we'll clear specific patterns
    # In production, consider using Redis SCAN with pattern matching
    patterns_to_clear = [f"{base_key}*"]
    
    if filters:
        filter_str = ":".join(f"{k}:{v}" for k, v in sorted(filters.items()) if v is not None)
        if filter_str:
            patterns_to_clear.append(f"{base_key}:{filter_str}*")
    
    # Note: Redis delete with wildcards requires SCAN in production
    # For now, we'll rely on TTL expiration or explicit key deletion
    for pattern in patterns_to_clear:
        # In a real implementation, you'd use SCAN here
        # For now, we'll just note that cache will expire naturally
        pass

