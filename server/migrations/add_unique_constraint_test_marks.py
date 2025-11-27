"""
Migration script to add unique constraint on test_marks table
to prevent duplicate marks for the same student/subject/class/academic_year/term combination
"""
import sys
import os

# Add parent directory to path for Docker compatibility
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text
import asyncio


async def add_unique_constraint():
    """Add unique constraint to test_marks table"""
    async with engine.begin() as conn:
        # Check if constraint already exists
        check_constraint_query = text("""
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'test_marks' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name = 'uq_test_marks_student_subject_class_academic_term'
        """)
        
        result = await conn.execute(check_constraint_query)
        existing = result.fetchone()
        
        if existing:
            print("✅ Unique constraint already exists. Skipping...")
            return
        
        # First, check for existing duplicates and handle them
        # We'll keep the most recent record for each duplicate combination
        print("🔍 Checking for existing duplicate records...")
        
        find_duplicates_query = text("""
            SELECT 
                school_id, std_id, subj_id, cls_id, academic_id, term,
                COUNT(*) as count,
                array_agg(test_mark_id ORDER BY created_at DESC) as mark_ids
            FROM test_marks
            WHERE is_deleted = false
            GROUP BY school_id, std_id, subj_id, cls_id, academic_id, term
            HAVING COUNT(*) > 1
        """)
        
        duplicates_result = await conn.execute(find_duplicates_query)
        duplicates = duplicates_result.fetchall()
        
        if duplicates:
            print(f"⚠️  Found {len(duplicates)} duplicate combinations. Keeping the most recent record for each...")
            
            for dup in duplicates:
                mark_ids = dup[6]  # array_agg result
                # Keep the first one (most recent), delete the rest
                ids_to_delete = mark_ids[1:] if len(mark_ids) > 1 else []
                
                if ids_to_delete:
                    delete_query = text("""
                        UPDATE test_marks 
                        SET is_deleted = true, updated_at = NOW()
                        WHERE test_mark_id = ANY(:ids)
                    """)
                    await conn.execute(delete_query, {"ids": ids_to_delete})
                    print(f"   Soft-deleted {len(ids_to_delete)} duplicate record(s) for combination")
        else:
            print("✅ No duplicate records found.")
        
        # Add unique constraint (only on non-deleted records using a partial unique index)
        print("🔧 Creating unique constraint...")
        
        # PostgreSQL doesn't support partial unique constraints directly,
        # so we'll create a unique partial index instead
        create_index_query = text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_test_marks_student_subject_class_academic_term
            ON test_marks (school_id, std_id, subj_id, cls_id, academic_id, term)
            WHERE is_deleted = false
        """)
        
        await conn.execute(create_index_query)
        print("✅ Unique constraint created successfully!")
        
        # Verify the constraint was created
        verify_query = text("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'test_marks' 
            AND indexname = 'uq_test_marks_student_subject_class_academic_term'
        """)
        
        verify_result = await conn.execute(verify_query)
        if verify_result.fetchone():
            print("✅ Constraint verified successfully!")
        else:
            print("⚠️  Warning: Could not verify constraint creation")


if __name__ == "__main__":
    print("=" * 60)
    print("Adding Unique Constraint to test_marks table")
    print("=" * 60)
    asyncio.run(add_unique_constraint())
    print("=" * 60)
    print("Migration completed!")
    print("=" * 60)

