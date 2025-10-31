#!/usr/bin/env python3
"""
Database setup script for Docker environment
"""
import asyncio
import subprocess
import sys
import time
from config import settings

async def wait_for_database():
    """Wait for database to be ready"""
    print("⏳ Waiting for database to be ready...")
    
    max_attempts = 30
    attempt = 0
    
    while attempt < max_attempts:
        try:
            # Test database connection
            from database import test_db_connection
            success = await test_db_connection()
            if success:
                print("✅ Database is ready!")
                return True
        except Exception as e:
            print(f"Attempt {attempt + 1}/{max_attempts}: Database not ready yet...")
        
        attempt += 1
        await asyncio.sleep(2)
    
    print("❌ Database not ready after 60 seconds")
    return False

async def setup_database():
    """Set up the database with all models"""
    print("🗄️  Setting up Inkinki Smart School Database")
    print("=" * 50)
    print(f"Database: {settings.DATABASE_URL}")
    print(f"Redis: {settings.REDIS_URL}")
    print("=" * 50)
    
    # Wait for database
    if not await wait_for_database():
        print("❌ Database setup failed - database not ready")
        return False
    
    # Create initial migration
    print("🔄 Creating initial migration...")
    try:
        result = subprocess.run([
            sys.executable, "-m", "alembic", "revision", "--autogenerate", "-m", "Initial migration with all models"
        ], capture_output=True, text=True, cwd=".")
        
        if result.returncode == 0:
            print("✅ Initial migration created!")
        else:
            print(f"⚠️  Migration creation warning: {result.stderr}")
    except Exception as e:
        print(f"⚠️  Migration creation error: {e}")
    
    # Run migrations
    print("🔄 Running database migrations...")
    try:
        result = subprocess.run([
            sys.executable, "-m", "alembic", "upgrade", "head"
        ], capture_output=True, text=True, cwd=".")
        
        if result.returncode == 0:
            print("✅ Database migrations completed!")
        else:
            print(f"❌ Migration failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Migration error: {e}")
        return False
    
    # Verify tables were created
    print("🔍 Verifying database setup...")
    try:
        from database import engine
        from models import School, Student, Parent, Teacher, Staff
        
        async with engine.begin() as conn:
            # Check if tables exist
            from sqlalchemy import text
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('schools', 'students', 'parents', 'teachers', 'staff')
            """))
            tables = result.fetchall()
            
            if tables:
                print(f"✅ Found {len(tables)} tables: {[table[0] for table in tables]}")
            else:
                print("⚠️  No tables found, creating them directly...")
                from database import Base
                await conn.run_sync(Base.metadata.create_all)
                print("✅ Tables created successfully!")
        
        print("🎉 Database setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database verification failed: {e}")
        return False

async def main():
    """Main setup function"""
    try:
        success = await setup_database()
        if success:
            print("\n🚀 Database is ready for the application!")
            print("You can now start the server with: python run_server.py")
        else:
            print("\n❌ Database setup failed!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n👋 Setup cancelled by user")
    except Exception as e:
        print(f"❌ Setup error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
