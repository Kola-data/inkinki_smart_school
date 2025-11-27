"""
Migration script to migrate data from assessment_marks to test_marks table
Run this script to copy data from assessment_marks to test_marks if needed
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from database import engine

async def migrate_assessment_to_test_marks():
    """Migrate data from assessment_marks to test_marks table"""
    async with engine.begin() as conn:
        try:
            # Check if assessment_marks table exists
            check_query = text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'assessment_marks'
                );
            """)
            result = await conn.execute(check_query)
            assessment_exists = result.scalar()
            
            if not assessment_exists:
                print("✅ assessment_marks table does not exist. Migration not needed.")
                return
            
            # Check if test_marks table exists
            check_test_query = text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'test_marks'
                );
            """)
            result = await conn.execute(check_test_query)
            test_exists = result.scalar()
            
            if not test_exists:
                print("❌ test_marks table does not exist. Please create it first.")
                return
            
            # Copy data from assessment_marks to test_marks
            # Map fields: ass_mark_id -> test_mark_id, ass_mark -> test_mark, ass_avg_mark -> test_avg_mark
            # Handle NULL values: test_mark is NOT NULL, so use COALESCE to default to 0
            migrate_query = text("""
                INSERT INTO test_marks (
                    test_mark_id, school_id, std_id, subj_id, cls_id, academic_id,
                    term, test_mark, test_avg_mark, status, is_published, is_deleted,
                    created_at, updated_at
                )
                SELECT 
                    ass_mark_id as test_mark_id,
                    school_id,
                    std_id,
                    subj_id,
                    cls_id,
                    academic_id,
                    term,
                    COALESCE(ass_mark, 0) as test_mark,
                    ass_avg_mark as test_avg_mark,
                    status,
                    is_published,
                    is_deleted,
                    created_at,
                    updated_at
                FROM assessment_marks
                WHERE NOT EXISTS (
                    SELECT 1 FROM test_marks 
                    WHERE test_marks.test_mark_id = assessment_marks.ass_mark_id
                )
            """)
            
            result = await conn.execute(migrate_query)
            print(f"✅ Migrated {result.rowcount} records from assessment_marks to test_marks")
            
            # Optional: Drop assessment_marks table after migration
            # Uncomment the following lines if you want to drop the old table
            # drop_query = text("DROP TABLE IF EXISTS assessment_marks CASCADE;")
            # await conn.execute(drop_query)
            # print("✅ Dropped assessment_marks table")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(migrate_assessment_to_test_marks())

