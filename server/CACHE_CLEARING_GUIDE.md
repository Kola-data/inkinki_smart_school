# Cache Clearing Guide

## Overview
This guide explains how to clear Redis caches and restart Redis with the new chunk-based pagination configuration.

## Cache Clearing Methods

### 1. Using the API Endpoint

#### Clear All Caches
```bash
curl -X DELETE http://localhost:8000/api/v1/cache/clear
```

#### Clear Caches by Pattern
```bash
curl -X DELETE "http://localhost:8000/api/v1/cache/clear?pattern=staff:*"
```

#### Clear Caches for a Specific School
```bash
curl -X DELETE http://localhost:8000/api/v1/cache/clear/school/{school_id}
```

### 2. Using Python Script

#### Clear All Caches
```bash
cd server
python3 scripts/clear_cache.py
```

#### Clear Caches by Pattern
```bash
cd server
python3 scripts/clear_cache.py "staff:*"
```

### 3. Using Shell Script (Clear + Restart Redis)

```bash
cd server
./scripts/clear_cache_and_restart_redis.sh
```

## Cache Key Patterns

The system uses chunk-based caching with the following patterns:

- `staff:school:{school_id}:page:{page}:size:{page_size}`
- `students:school:{school_id}:page:{page}:size:{page_size}`
- `teachers:school:{school_id}:with_staff:page:{page}:size:{page_size}`
- `parents:school:{school_id}:page:{page}:size:{page_size}`
- `expense:school:{school_id}:academic_id:{academic_id}:page:{page}:size:{page_size}`
- `fees:school:{school_id}:academic_id:{academic_id}:page:{page}:size:{page_size}`
- `testmarks:school:{school_id}:academic_id:{academic_id}:page:{page}:size:{page_size}`
- `exam:school:{school_id}:academic_id:{academic_id}:page:{page}:size:{page_size}`
- `attendance:school:{school_id}:page:{page}:size:{page_size}`

## Redis Configuration

The Redis client has been optimized for chunk-based caching:

- **Connection Pooling**: Max 50 connections
- **Socket Keepalive**: Enabled
- **Health Check Interval**: 30 seconds
- **Retry on Timeout**: Enabled
- **Cache TTL**: 3600 seconds (1 hour) - configurable via `REDIS_CACHE_TTL`

## When to Clear Cache

Clear cache when:
- Data has been updated and you want fresh data
- Testing pagination functionality
- After bulk data imports
- When cache appears stale
- After schema changes

## Performance Notes

- Chunk-based caching improves cache hit rates
- Each page is cached separately, allowing partial cache hits
- Cache keys include filter parameters for accurate caching
- Old cache entries will expire automatically based on TTL

