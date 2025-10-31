#!/usr/bin/env python3
"""
Startup script for the async Inkinki Smart School API
"""
import asyncio
import uvicorn
from config import settings
from database import engine, Base
import models  # Import main models.py file
from models import *  # Import all school management models from models package

async def create_tables():
    """Create all database tables"""
    print("🔧 Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created successfully!")

async def main():
    """Main startup function"""
    print("🚀 Starting Inkinki Smart School API (Async Version)")
    print("=" * 60)
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Debug Mode: {settings.DEBUG}")
    print(f"Database: {settings.DATABASE_URL}")
    print(f"Redis: {settings.REDIS_URL}")
    print("=" * 60)
    
    # Create tables
    await create_tables()
    
    # Start the server
    print(f"🌐 Starting server on {settings.HOST}:{settings.PORT}")
    config = uvicorn.Config(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL
    )
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Shutting down gracefully...")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        exit(1)
