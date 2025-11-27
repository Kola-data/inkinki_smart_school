"""
Migration script to create password_resets table
Run this script to create the password_resets table in the database
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import engine, Base
from models.password_reset import PasswordReset

async def create_table():
    """Create password_resets table"""
    async with engine.begin() as conn:
        # Create the table
        await conn.run_sync(Base.metadata.create_all, tables=[PasswordReset.__table__])
        print("✅ password_resets table created successfully!")

if __name__ == "__main__":
    asyncio.run(create_table())

