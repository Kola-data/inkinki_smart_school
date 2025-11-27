#!/bin/bash

# Script to clear all Redis caches and restart Redis with new configuration
# This script clears all chunk-based paginated caches and restarts Redis

echo "🔄 Clearing all Redis caches and restarting Redis..."

# Change to server directory
cd "$(dirname "$0")/.."

# Clear all caches using Python script
echo "📦 Clearing all cache entries..."
python3 -c "
import asyncio
import sys
sys.path.insert(0, '.')
from utils.clear_cache import clear_all_cache

async def main():
    deleted = await clear_all_cache()
    print(f'✅ Cleared {deleted} cache entries')

asyncio.run(main())
"

# Check if Redis is running and restart it
echo ""
echo "🔄 Checking Redis status..."

# Try to ping Redis
if command -v redis-cli > /dev/null 2>&1; then
    REDIS_HOST=${REDIS_HOST:-localhost}
    REDIS_SERVER_PORT=6379}
    
    if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
        echo "✅ Redis is running"
        echo "🔄 Restarting Redis..."
        
        # Restart Redis (adjust command based on your system)
        if command -v systemctl > /dev/null 2>&1; then
            sudo systemctl restart redis
            echo "✅ Redis restarted via systemctl"
        elif command -v service > /dev/null 2>&1; then
            sudo service redis restart
            echo "✅ Redis restarted via service"
        else
            echo "⚠️  Please restart Redis manually"
        fi
        
        # Wait a moment for Redis to restart
        sleep 2
        
        # Verify Redis is running
        if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
            echo "✅ Redis is running after restart"
        else
            echo "⚠️  Redis may not have restarted properly"
        fi
    else
        echo "⚠️  Redis is not running. Please start Redis manually."
    fi
else
    echo "⚠️  redis-cli not found. Please restart Redis manually."
fi

echo ""
echo "✅ Cache clearing and Redis restart complete!"
echo ""
echo "📝 Note: Redis has been configured with:"
echo "   - Optimized connection pooling (max_connections: 50)"
echo "   - Socket keepalive enabled"
echo "   - Health check interval: 30 seconds"
echo "   - Retry on timeout enabled"
echo "   - Chunk-based pagination cache support"

