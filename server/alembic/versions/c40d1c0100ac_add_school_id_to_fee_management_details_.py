"""add_school_id_to_fee_management_details_if_missing

Revision ID: c40d1c0100ac
Revises: f97561774eac
Create Date: 2025-11-04 20:36:28.346856

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c40d1c0100ac'
down_revision: Union[str, Sequence[str], None] = 'f97561774eac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Check current table structure
    from sqlalchemy import inspect
    
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('fee_management_details')]
    
    # Check if we have the old structure (std_id, fee_type_id, etc.) or new structure (fee_id)
    has_old_structure = 'std_id' in columns
    has_new_structure = 'fee_id' in columns
    has_school_id = 'school_id' in columns
    
    # If school_id already exists, do nothing
    if has_school_id:
        return
    
    if has_old_structure and not has_new_structure:
        # Need to migrate from old structure to new structure first
        # Add new columns
        op.add_column('fee_management_details', sa.Column('school_id', sa.UUID(), nullable=True))
        op.add_column('fee_management_details', sa.Column('fee_id', sa.UUID(), nullable=True))
        op.add_column('fee_management_details', sa.Column('amount', sa.Float(), nullable=True))
        op.add_column('fee_management_details', sa.Column('invoice_img', sa.String(length=500), nullable=True))
        
        # Populate fee_id from fee_management based on std_id, term, academic_id, fee_type_id
        op.execute("""
            UPDATE fee_management_details fmd
            SET fee_id = (
                SELECT fm.fee_id 
                FROM fee_management fm 
                WHERE fm.std_id = fmd.std_id 
                AND fm.term = fmd.term
                AND fm.academic_id = fmd.academic_id
                AND fm.fee_type_id = fmd.fee_type_id
                LIMIT 1
            )
            WHERE fee_id IS NULL
        """)
        
        # Populate school_id from fee_management
        op.execute("""
            UPDATE fee_management_details fmd
            SET school_id = (
                SELECT fm.school_id 
                FROM fee_management fm 
                WHERE fm.fee_id = fmd.fee_id 
                LIMIT 1
            )
            WHERE school_id IS NULL
        """)
        
        # Set default values for amount if NULL (use 0)
        op.execute("UPDATE fee_management_details SET amount = 0.0 WHERE amount IS NULL")
        
        # Make columns NOT NULL
        op.alter_column('fee_management_details', 'school_id', nullable=False)
        op.alter_column('fee_management_details', 'fee_id', nullable=False)
        op.alter_column('fee_management_details', 'amount', nullable=False)
        
        # Update status column type if needed - skip if already VARCHAR
        if 'status' in columns:
            # Check if status is INTEGER
            status_col = next((col for col in inspector.get_columns('fee_management_details') if col['name'] == 'status'), None)
            if status_col and 'INTEGER' in str(status_col['type']):
                # Convert status column type using USING clause
                op.execute("""
                    ALTER TABLE fee_management_details 
                    ALTER COLUMN status TYPE VARCHAR(50) USING 
                    CASE 
                        WHEN status = 0 THEN 'pending'
                        WHEN status = 1 THEN 'paid'
                        WHEN status = 2 THEN 'overdue'
                        WHEN status = 3 THEN 'partial'
                        ELSE 'pending'
                    END::VARCHAR(50)
                """)
                op.execute("UPDATE fee_management_details SET status = 'pending' WHERE status IS NULL")
                op.alter_column('fee_management_details', 'status', nullable=False)
        
        # Drop old foreign keys
        try:
            op.drop_constraint(op.f('fee_management_details_std_id_fkey'), 'fee_management_details', type_='foreignkey')
        except:
            pass
        try:
            op.drop_constraint(op.f('fee_management_details_academic_id_fkey'), 'fee_management_details', type_='foreignkey')
        except:
            pass
        try:
            op.drop_constraint(op.f('fee_management_details_fee_type_id_fkey'), 'fee_management_details', type_='foreignkey')
        except:
            pass
        
        # Add new foreign keys
        op.create_foreign_key(
            'fee_management_details_school_id_fkey',
            'fee_management_details', 'schools',
            ['school_id'], ['school_id']
        )
        op.create_foreign_key(
            'fee_management_details_fee_id_fkey',
            'fee_management_details', 'fee_management',
            ['fee_id'], ['fee_id']
        )
        
        # Drop old columns
        op.drop_column('fee_management_details', 'std_id')
        op.drop_column('fee_management_details', 'fee_type_id')
        op.drop_column('fee_management_details', 'academic_id')
        op.drop_column('fee_management_details', 'term')
        
        # Update indexes
        try:
            op.drop_index(op.f('idx_fee_detail_term'), table_name='fee_management_details')
        except:
            pass
        try:
            # Check if index already exists
            indexes = [idx['name'] for idx in inspector.get_indexes('fee_management_details')]
            if 'idx_fee_detail_status' not in indexes:
                op.create_index('idx_fee_detail_status', 'fee_management_details', ['status'], unique=False)
        except:
            pass
        
    elif has_new_structure and not has_school_id:
        # Just add school_id column
        op.add_column('fee_management_details', sa.Column('school_id', sa.UUID(), nullable=True))
        
        # Populate school_id from fee_management
        op.execute("""
            UPDATE fee_management_details fmd
            SET school_id = (
                SELECT fm.school_id 
                FROM fee_management fm 
                WHERE fm.fee_id = fmd.fee_id 
                LIMIT 1
            )
            WHERE school_id IS NULL
        """)
        
        # Set default for any remaining NULLs
        op.execute("""
            UPDATE fee_management_details 
            SET school_id = '00000000-0000-0000-0000-000000000000'::uuid
            WHERE school_id IS NULL
        """)
        
        # Make column NOT NULL
        op.alter_column('fee_management_details', 'school_id', nullable=False)
        
        # Add foreign key constraint
        op.create_foreign_key(
            'fee_management_details_school_id_fkey',
            'fee_management_details', 'schools',
            ['school_id'], ['school_id']
        )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove foreign key constraint
    op.drop_constraint('fee_management_details_school_id_fkey', 'fee_management_details', type_='foreignkey')
    
    # Drop column
    op.drop_column('fee_management_details', 'school_id')
