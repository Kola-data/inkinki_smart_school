import uvicorn
import asyncio
from database import engine, Base
import models  # Import main models.py file
from models import *  # Import all school management models from models package
from config import settings

# Create database tables
async def create_tables():
    """Create all database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created successfully!")

async def main():
    # Create tables before starting the server
    await create_tables()
    
    # Run the FastAPI application
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
    asyncio.run(main())
