"""Add academic_id to expenses and pagination support

Revision ID: add_academic_expenses_pagination
Revises: f591dd9e6646
Create Date: 2025-11-08 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_academic_expenses_pagination'
down_revision: Union[str, None] = 'f591dd9e6646'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add academic_id column to expenses table
    op.add_column('expenses', sa.Column('academic_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Create foreign key constraint
    op.create_foreign_key(
        'fk_expenses_academic_id',
        'expenses',
        'academic_years',
        ['academic_id'],
        ['academic_id']
    )
    
    # Create index for better query performance
    op.create_index('ix_expenses_academic_id', 'expenses', ['academic_id'])
    
    # Add composite index for common query patterns (school_id + academic_id + is_deleted)
    op.create_index('ix_expenses_school_academic_deleted', 'expenses', ['school_id', 'academic_id', 'is_deleted'])
    
    # Add index on status for filtering
    op.create_index('ix_expenses_status', 'expenses', ['status'])
    
    # Add index on expense_date for date-based queries
    op.create_index('ix_expenses_expense_date', 'expenses', ['expense_date'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_expenses_expense_date', table_name='expenses')
    op.drop_index('ix_expenses_status', table_name='expenses')
    op.drop_index('ix_expenses_school_academic_deleted', table_name='expenses')
    op.drop_index('ix_expenses_academic_id', table_name='expenses')
    
    # Drop foreign key constraint
    op.drop_constraint('fk_expenses_academic_id', 'expenses', type_='foreignkey')
    
    # Drop column
    op.drop_column('expenses', 'academic_id')

