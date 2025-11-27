# Redis Configuration Guide

## Overview

The Redis configuration has been updated to use meaningful, descriptive names while maintaining backward compatibility with existing code.

## Configuration Variables

### New Meaningful Names (Recommended)

| Variable Name | Description | Default Value |
|--------------|-------------|---------------|
| `REDIS_CONNECTION_URL` | Complete Redis connection URL | `redis://localhost:6379` |
| `REDIS_SERVER_HOST` | Redis server hostname/IP | `localhost` |
| `REDIS_SERVER_PORT` | Redis server port number | `6379` |
| `REDIS_AUTH_PASSWORD` | Redis authentication password (if required) | `` (empty) |
| `REDIS_DATABASE_NUMBER` | Redis database number (0-15) | `0` |
| `REDIS_CACHE_EXPIRATION_SECONDS` | Default cache expiration time in seconds | `3600` (1 hour) |

### Legacy Names (Backward Compatible)

The following legacy names are still supported but will be deprecated in the future:

| Legacy Name | Maps To | Status |
|------------|---------|--------|
| `REDIS_URL` | `REDIS_CONNECTION_URL` | Deprecated |
| `REDIS_HOST` | `REDIS_SERVER_HOST` | Deprecated |
| `REDIS_PORT` | `REDIS_SERVER_PORT` | Deprecated |
| `REDIS_PASSWORD` | `REDIS_AUTH_PASSWORD` | Deprecated |
| `REDIS_DB` | `REDIS_DATABASE_NUMBER` | Deprecated |
| `REDIS_CACHE_TTL` | `REDIS_CACHE_EXPIRATION_SECONDS` | Deprecated |
| `CACHE_TTL` | `CACHE_EXPIRATION_SECONDS` | Deprecated |

## Local Redis Setup

### Default Configuration

For local development, Redis is configured to connect to:
- **Host:** `localhost`
- **Port:** `6379` (standard Redis port)
- **Database:** `0` (default database)
- **Password:** None (no authentication required)

### Environment Variables

Add to your `.env` file:

```bash
# Redis Configuration (Local Redis Server)
REDIS_CONNECTION_URL=redis://localhost:6379
REDIS_SERVER_HOST=localhost
REDIS_SERVER_PORT=6379
REDIS_AUTH_PASSWORD=
REDIS_DATABASE_NUMBER=0
REDIS_CACHE_EXPIRATION_SECONDS=3600
```

### Starting Local Redis

**Option 1: Using systemd (if installed as service)**
```bash
sudo systemctl start redis
sudo systemctl enable redis  # Enable on boot
```

**Option 2: Manual start**
```bash
redis-server
```

**Option 3: Using Docker**
```bash
docker run -d --name inkingi_redis -p 6379:6379 redis:7-alpine
```

### Verifying Redis Connection

```bash
# Test connection
redis-cli ping
# Should return: PONG

# Check if Redis is running
redis-cli -h localhost -p 6379 ping
```

## Code Usage

### In Python Code

**Using new meaningful names:**
```python
from config import settings

# Connection URL
redis_url = settings.REDIS_CONNECTION_URL

# Individual settings
host = settings.REDIS_SERVER_HOST
port = settings.REDIS_SERVER_PORT
password = settings.REDIS_AUTH_PASSWORD
db = settings.REDIS_DATABASE_NUMBER

# Cache expiration
cache_ttl = settings.REDIS_CACHE_EXPIRATION_SECONDS
```

**Legacy names (still work):**
```python
# These still work but are deprecated
redis_url = settings.REDIS_URL
host = settings.REDIS_HOST
port = settings.REDIS_PORT
```

### In Configuration Files

**Recommended (.env):**
```bash
REDIS_CONNECTION_URL=redis://localhost:6379
REDIS_SERVER_HOST=localhost
REDIS_SERVER_PORT=6379
REDIS_DATABASE_NUMBER=0
REDIS_CACHE_EXPIRATION_SECONDS=3600
```

## Migration Guide

### Updating Existing Code

1. **Replace `settings.REDIS_URL`** → `settings.REDIS_CONNECTION_URL`
2. **Replace `settings.REDIS_HOST`** → `settings.REDIS_SERVER_HOST`
3. **Replace `settings.REDIS_PORT`** → `settings.REDIS_SERVER_PORT`
4. **Replace `settings.REDIS_PASSWORD`** → `settings.REDIS_AUTH_PASSWORD`
5. **Replace `settings.REDIS_DB`** → `settings.REDIS_DATABASE_NUMBER`
6. **Replace `settings.REDIS_CACHE_TTL`** → `settings.REDIS_CACHE_EXPIRATION_SECONDS`

### Example Migration

**Before:**
```python
redis_url = settings.REDIS_URL
cache_ttl = settings.REDIS_CACHE_TTL
```

**After:**
```python
redis_url = settings.REDIS_CONNECTION_URL
cache_ttl = settings.REDIS_CACHE_EXPIRATION_SECONDS
```

## Troubleshooting

### Connection Issues

1. **Check if Redis is running:**
   ```bash
   redis-cli ping
   ```

2. **Check Redis port:**
   ```bash
   netstat -tuln | grep 6379
   # or
   ss -tuln | grep 6379
   ```

3. **Test connection from Python:**
   ```python
   from redis_client import test_redis_connection
   import asyncio
   asyncio.run(test_redis_connection())
   ```

### Configuration Issues

- Ensure `.env` file has correct Redis settings
- Check that `REDIS_SERVER_PORT` is `6379` for local Redis
- Verify `REDIS_SERVER_HOST` is `localhost` for local setup
- If using password, set `REDIS_AUTH_PASSWORD`

## Files Updated

- ✅ `config.py` - Added new meaningful names with backward compatibility
- ✅ `redis_client.py` - Updated to use new configuration names
- ✅ `env_template.txt` - Updated with new variable names
- ✅ `.env` - Updated with new configuration

## Notes

- All legacy property names are still accessible via `@property` decorators
- Existing code will continue to work without changes
- New code should use the meaningful names
- The configuration automatically falls back to legacy names if new names are not set

