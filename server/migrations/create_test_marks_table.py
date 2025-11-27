"""
Script to create test_marks table in Docker
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import engine, Base
from models.test_mark import TestMark

async def create_test_marks_table():
    """Create test_marks table if it doesn't exist"""
    async with engine.begin() as conn:
        try:
            # Create all tables (this will create test_marks if it doesn't exist)
            await conn.run_sync(Base.metadata.create_all)
            print("✅ test_marks table created/verified successfully!")
        except Exception as e:
            print(f"❌ Failed to create table: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(create_test_marks_table())

