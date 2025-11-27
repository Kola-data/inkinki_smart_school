#!/bin/bash
# Script to start Redis server for Inkingi Smart School

echo "🔍 Checking Redis installation..."

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis is not installed."
    echo ""
    echo "To install Redis, run:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install redis-server"
    echo ""
    echo "Or use Docker:"
    echo "  docker run -d --name inkingi_redis -p 6379:6379 redis:7-alpine"
    exit 1
fi

# Check if Redis is already running
if redis-cli ping &> /dev/null; then
    echo "✅ Redis is already running"
    redis-cli ping
    exit 0
fi

# Try to start Redis using systemd
if systemctl is-active --quiet redis 2>/dev/null; then
    echo "✅ Redis service is active"
    redis-cli ping
    exit 0
fi

# Try to start Redis service
if systemctl start redis 2>/dev/null; then
    echo "✅ Redis service started successfully"
    sleep 1
    redis-cli ping
    exit 0
fi

# Try to start Redis manually
echo "⚠️  Could not start Redis service. Attempting manual start..."
echo "Starting Redis server in background..."

# Start Redis in background
redis-server --daemonize yes --port 6379

sleep 2

# Test connection
if redis-cli ping &> /dev/null; then
    echo "✅ Redis started successfully"
    redis-cli ping
else
    echo "❌ Failed to start Redis"
    echo ""
    echo "Try starting manually:"
    echo "  redis-server"
    echo ""
    echo "Or check Redis logs:"
    echo "  tail -f /var/log/redis/redis-server.log"
    exit 1
fi

