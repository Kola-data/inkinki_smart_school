"""
Migration script to add indexes to all foreign keys in the database
Run this script to add indexes to foreign keys that don't already have them
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text, inspect
from database import engine

# Map of table names to their foreign key columns
# This is based on the models - foreign keys that don't already have index=True
FOREIGN_KEY_INDEXES = {
    # Students table
    'students': [
        ('school_id', 'ix_students_school_id'),
        ('par_id', 'ix_students_par_id'),
        ('started_class', 'ix_students_started_class'),
        ('current_class', 'ix_students_current_class'),
    ],
    # Teachers table
    'teachers': [
        # staff_id already has unique=True which creates an index
    ],
    # Classes table
    'classes': [
        ('cls_manager', 'ix_classes_cls_manager'),
    ],
    # Class Teachers table
    'class_teachers': [
        ('teacher_id', 'ix_class_teachers_teacher_id'),
        ('subj_id', 'ix_class_teachers_subj_id'),
        ('cls_id', 'ix_class_teachers_cls_id'),
    ],
    # Parents table
    'parents': [
        ('school_id', 'ix_parents_school_id'),
    ],
    # Subjects table
    # school_id already has index=True
    # Academic Years table
    # school_id already has index=True
    # Fee Types table
    'fee_types': [
        ('school_id', 'ix_fee_types_school_id'),
    ],
    # Fee Management table
    'fee_management': [
        ('school_id', 'ix_fee_management_school_id'),
        ('std_id', 'ix_fee_management_std_id'),
        ('fee_type_id', 'ix_fee_management_fee_type_id'),
        ('academic_id', 'ix_fee_management_academic_id'),
    ],
    # Fee Details table
    'fee_details': [
        ('school_id', 'ix_fee_details_school_id'),
        ('fee_id', 'ix_fee_details_fee_id'),
    ],
    # Fee Invoices table
    'fee_invoices': [
        ('school_id', 'ix_fee_invoices_school_id'),
        ('fee_id', 'ix_fee_invoices_fee_id'),
    ],
    # Expenses table
    'expenses': [
        ('school_id', 'ix_expenses_school_id'),
        ('added_by', 'ix_expenses_added_by'),
        ('approved_by', 'ix_expenses_approved_by'),
    ],
    # Inventory table
    'inventory': [
        ('school_id', 'ix_inventory_school_id'),
    ],
    # Attendance table
    'students_attendance': [
        ('school_id', 'ix_attendance_school_id'),
        ('teacher_id', 'ix_attendance_teacher_id'),
        ('std_id', 'ix_attendance_std_id'),
        ('subj_id', 'ix_attendance_subj_id'),
        ('cls_id', 'ix_attendance_cls_id'),
    ],
    # Test Marks table
    'test_marks': [
        ('school_id', 'ix_test_marks_school_id'),
        ('std_id', 'ix_test_marks_std_id'),
        ('subj_id', 'ix_test_marks_subj_id'),
        ('cls_id', 'ix_test_marks_cls_id'),
        ('academic_id', 'ix_test_marks_academic_id'),
    ],
    # Exam Marks table
    'exam_marks': [
        ('school_id', 'ix_exam_marks_school_id'),
        ('std_id', 'ix_exam_marks_std_id'),
        ('subj_id', 'ix_exam_marks_subj_id'),
        ('cls_id', 'ix_exam_marks_cls_id'),
        ('academic_id', 'ix_exam_marks_academic_id'),
    ],
    # Assessment Marks table (if still exists)
    'assessment_marks': [
        ('school_id', 'ix_assessment_marks_school_id'),
        ('std_id', 'ix_assessment_marks_std_id'),
        ('subj_id', 'ix_assessment_marks_subj_id'),
        ('cls_id', 'ix_assessment_marks_cls_id'),
        ('academic_id', 'ix_assessment_marks_academic_id'),
    ],
}

async def check_index_exists(conn, table_name: str, index_name: str) -> bool:
    """Check if an index already exists"""
    query = text("""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = :table_name 
            AND indexname = :index_name
        )
    """)
    result = await conn.execute(query, {"table_name": table_name, "index_name": index_name})
    return result.scalar()

async def check_table_exists(conn, table_name: str) -> bool:
    """Check if a table exists"""
    query = text("""
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = :table_name
        )
    """)
    result = await conn.execute(query, {"table_name": table_name})
    return result.scalar()

async def check_column_exists(conn, table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table"""
    query = text("""
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = :table_name 
            AND column_name = :column_name
        )
    """)
    result = await conn.execute(query, {"table_name": table_name, "column_name": column_name})
    return result.scalar()

async def add_indexes():
    """Add indexes to all foreign keys"""
    async with engine.begin() as conn:
        print("🔍 Checking for foreign keys that need indexes...\n")
        
        indexes_created = 0
        indexes_skipped = 0
        errors = []
        
        for table_name, foreign_keys in FOREIGN_KEY_INDEXES.items():
            # Check if table exists
            table_exists = await check_table_exists(conn, table_name)
            if not table_exists:
                print(f"⚠️  Table '{table_name}' does not exist, skipping...")
                continue
            
            print(f"📋 Processing table: {table_name}")
            
            for column_name, index_name in foreign_keys:
                try:
                    # Check if column exists
                    column_exists = await check_column_exists(conn, table_name, column_name)
                    if not column_exists:
                        print(f"   ⚠️  Column '{column_name}' does not exist in '{table_name}', skipping...")
                        continue
                    
                    # Check if index already exists
                    index_exists = await check_index_exists(conn, table_name, index_name)
                    
                    if index_exists:
                        print(f"   ✅ Index '{index_name}' already exists on {table_name}.{column_name}")
                        indexes_skipped += 1
                    else:
                        # Create index
                        create_index_sql = text(f"""
                            CREATE INDEX IF NOT EXISTS {index_name} 
                            ON {table_name} ({column_name})
                        """)
                        await conn.execute(create_index_sql)
                        print(f"   ✅ Created index '{index_name}' on {table_name}.{column_name}")
                        indexes_created += 1
                        
                except Exception as e:
                    error_msg = f"   ❌ Error creating index '{index_name}' on {table_name}.{column_name}: {str(e)}"
                    print(error_msg)
                    errors.append(error_msg)
            
            print()
        
        print("=" * 60)
        print(f"✅ Indexes created: {indexes_created}")
        print(f"⏭️  Indexes skipped (already exist): {indexes_skipped}")
        if errors:
            print(f"❌ Errors: {len(errors)}")
            for error in errors:
                print(f"   {error}")
        print("=" * 60)
        print("\n✅ Migration completed!")

if __name__ == "__main__":
    asyncio.run(add_indexes())


