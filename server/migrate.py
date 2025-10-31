#!/usr/bin/env python3
"""
Database migration script for Inkinki Smart School API
"""
import asyncio
import subprocess
import sys
from config import settings

async def create_initial_migration():
    """Create the initial migration with all models"""
    print("🔄 Creating initial migration...")
    
    try:
        # Generate migration
        result = subprocess.run([
            sys.executable, "-m", "alembic", "revision", "--autogenerate", "-m", "Initial migration with all models"
        ], capture_output=True, text=True, cwd=".")
        
        if result.returncode == 0:
            print("✅ Initial migration created successfully!")
            print("Migration file generated in alembic/versions/")
            return True
        else:
            print(f"❌ Migration creation failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error creating migration: {e}")
        return False

async def run_migrations():
    """Run all pending migrations"""
    print("🔄 Running database migrations...")
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "alembic", "upgrade", "head"
        ], capture_output=True, text=True, cwd=".")
        
        if result.returncode == 0:
            print("✅ Database migrations completed successfully!")
            return True
        else:
            print(f"❌ Migration failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error running migrations: {e}")
        return False

async def check_migration_status():
    """Check the current migration status"""
    print("📊 Checking migration status...")
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "alembic", "current"
        ], capture_output=True, text=True, cwd=".")
        
        if result.returncode == 0:
            print(f"Current migration: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ Status check failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error checking status: {e}")
        return False

async def main():
    """Main migration function"""
    print("🗄️  Inkinki Smart School Database Migration Tool")
    print("=" * 50)
    print(f"Database: {settings.DATABASE_URL}")
    print("=" * 50)
    
    # Check if this is the first migration
    print("📋 Checking for existing migrations...")
    
    # Create initial migration
    success = await create_initial_migration()
    if not success:
        print("❌ Failed to create initial migration")
        return
    
    # Run migrations
    success = await run_migrations()
    if not success:
        print("❌ Failed to run migrations")
        return
    
    # Check status
    await check_migration_status()
    
    print("🎉 Database migration completed successfully!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Migration cancelled by user")
    except Exception as e:
        print(f"❌ Migration error: {e}")
        exit(1)
