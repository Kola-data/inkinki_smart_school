#!/usr/bin/env python3
"""
Script to cleanup logs: delete all DB logs, delete old log files (keep only today's), 
and import only error logs from today's file.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from database import get_db_session
from services.log_import_service import LogImportService


async def main():
    """Main cleanup function"""
    print("🧹 Starting log cleanup...")
    print("=" * 60)
    
    async for db in get_db_session():
        try:
            import_service = LogImportService()
            
            # Step 1: Delete all logs from database
            print("\n📊 Step 1: Deleting all logs from database...")
            deleted_count = await import_service.delete_all_logs_from_db(db)
            print(f"   ✅ Deleted {deleted_count} logs from database")
            
            # Step 2: Delete old log files (keep only today's)
            print("\n📁 Step 2: Cleaning up old log files...")
            cleanup_result = import_service.delete_old_log_files(keep_today_only=True)
            if cleanup_result["success"]:
                print(f"   ✅ Deleted {cleanup_result['deleted']} log files")
                print(f"   📄 Kept file: {cleanup_result.get('kept_file', 'None')}")
            else:
                print(f"   ⚠️  {cleanup_result['message']}")
            
            # Step 3: Import only error logs from today's file
            print("\n📥 Step 3: Importing error logs from today's file...")
            import_result = await import_service.import_error_logs_from_today(db)
            if import_result["success"]:
                print(f"   ✅ Imported {import_result['imported']} error logs")
                print(f"   📄 From file: {import_result.get('file', 'None')}")
            else:
                print(f"   ⚠️  {import_result['message']}")
            
            print("\n" + "=" * 60)
            print("✅ Cleanup completed successfully!")
            print("\n📋 Summary:")
            print(f"   - Database logs deleted: {deleted_count}")
            print(f"   - Log files deleted: {cleanup_result.get('deleted', 0)}")
            print(f"   - Error logs imported: {import_result.get('imported', 0)}")
            
        except Exception as e:
            print(f"\n❌ Error during cleanup: {str(e)}")
            import traceback
            traceback.print_exc()
            return 1
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

