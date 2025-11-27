#!/bin/bash

# Script to clear all Redis caches and restart Redis with new configuration

echo "🔄 Clearing all Redis caches and restarting Redis..."

# Get Redis connection details from environment or use defaults
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_SERVER_PORT=6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-""}

# Clear all caches using Python script
echo "📦 Clearing all cache entries..."
cd "$(dirname "$0")/.."
python3 -c "
import asyncio
from utils.clear_cache import clear_all_cache

async def main():
    deleted = await clear_all_cache()
    print(f'✅ Cleared {deleted} cache entries')

asyncio.run(main())
"

# Check if Redis is running
if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
    echo "🔄 Restarting Redis..."
    
    # Flush all databases (optional - uncomment if you want to clear everything)
    # redis-cli -h $REDIS_HOST -p $REDIS_PORT FLUSHALL
    
    # Restart Redis (adjust command based on your system)
    if command -v systemctl > /dev/null 2>&1; then
        sudo systemctl restart redis
    elif command -v service > /dev/null 2>&1; then
        sudo service redis restart
    else
        echo "⚠️  Please restart Redis manually"
    fi
    
    echo "✅ Redis restarted"
else
    echo "⚠️  Redis is not running. Please start Redis manually."
fi

echo "✅ Cache clearing and Redis restart complete!"

