#!/usr/bin/env python3
"""
Production-ready startup script for the Inkingi Smart School API
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

async def run_migrations():
    """Run database migrations using Alembic"""
    import subprocess
    import sys
    
    print("🔄 Running database migrations...")
    try:
        # Run alembic upgrade
        result = subprocess.run([
            sys.executable, "-m", "alembic", "upgrade", "head"
        ], capture_output=True, text=True, cwd=".")
        
        if result.returncode == 0:
            print("✅ Database migrations completed successfully!")
        else:
            print(f"❌ Migration failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error running migrations: {e}")
        return False
    
    return True

async def main():
    """Main startup function"""
    print("🚀 Starting Inkingi Smart School API (Production Mode)")
    print("=" * 60)
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Debug Mode: {settings.DEBUG}")
    print(f"Database: {settings.DATABASE_URL}")
    print(f"Redis: {settings.REDIS_URL}")
    print("=" * 60)
    
    # Run migrations first
    migration_success = await run_migrations()
    if not migration_success:
        print("⚠️  Migrations failed, creating tables directly...")
        await create_tables()
    
    # Start the server
    print(f"🌐 Starting server on {settings.HOST}:{settings.PORT}")
    # Keep it simple: use uvicorn.run with reload enabled
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL,
        access_log=True,
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Shutting down gracefully...")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        exit(1)
