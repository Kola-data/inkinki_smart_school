#!/usr/bin/env python3
"""Script to clear all Redis caches"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.clear_cache import clear_all_cache, clear_cache_by_pattern

async def main():
    """Main function to clear caches"""
    if len(sys.argv) > 1:
        pattern = sys.argv[1]
        print(f"Clearing cache entries matching pattern: {pattern}")
        deleted = await clear_cache_by_pattern(pattern)
    else:
        print("Clearing all cache entries...")
        deleted = await clear_all_cache()
    
    print(f"✅ Cleared {deleted} cache entries")
    return deleted

if __name__ == "__main__":
    asyncio.run(main())

