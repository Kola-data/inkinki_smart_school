"""transform_inventory_to_expenses

Revision ID: f591dd9e6646
Revises: 4cf9e93f871b
Create Date: 2025-11-05 11:42:07.314705

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f591dd9e6646'
down_revision: Union[str, Sequence[str], None] = '4cf9e93f871b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Rename table
    op.rename_table('inventory_management', 'expenses')
    
    # Rename columns
    op.alter_column('expenses', 'inv_id', new_column_name='expense_id')
    op.alter_column('expenses', 'inv_name', new_column_name='title')
    op.alter_column('expenses', 'inv_desc', new_column_name='description')
    op.alter_column('expenses', 'inv_price', new_column_name='amount')
    op.alter_column('expenses', 'inv_date', new_column_name='expense_date')
    op.alter_column('expenses', 'inv_status', new_column_name='status')
    
    # Drop old column
    op.drop_column('expenses', 'inv_service')
    
    # Add new columns
    op.add_column('expenses', sa.Column('category', sa.String(length=100), nullable=True))
    op.add_column('expenses', sa.Column('payment_method', sa.String(length=50), nullable=True))
    op.add_column('expenses', sa.Column('invoice_image', sa.JSON(), nullable=True))
    op.add_column('expenses', sa.Column('added_by', sa.UUID(), nullable=True))
    op.add_column('expenses', sa.Column('approved_by', sa.UUID(), nullable=True))
    
    # Set default values
    op.execute("UPDATE expenses SET category = 'Other' WHERE category IS NULL")
    op.execute("UPDATE expenses SET status = 'PENDING' WHERE status IS NULL OR status = ''")
    
    # Make category NOT NULL
    op.alter_column('expenses', 'category', nullable=False)
    
    # Add foreign key constraints for added_by and approved_by to staff table
    op.create_foreign_key('expenses_added_by_fkey', 'expenses', 'staff', ['added_by'], ['staff_id'], ondelete='SET NULL')
    op.create_foreign_key('expenses_approved_by_fkey', 'expenses', 'staff', ['approved_by'], ['staff_id'], ondelete='SET NULL')
    
    # Rename index
    op.drop_index('ix_inventory_management_inv_id', table_name='expenses')
    op.create_index('ix_expenses_expense_id', 'expenses', ['expense_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop new columns
    op.drop_constraint('expenses_approved_by_fkey', 'expenses', type_='foreignkey')
    op.drop_constraint('expenses_added_by_fkey', 'expenses', type_='foreignkey')
    op.drop_column('expenses', 'approved_by')
    op.drop_column('expenses', 'added_by')
    op.drop_column('expenses', 'invoice_image')
    op.drop_column('expenses', 'payment_method')
    op.drop_column('expenses', 'category')
    
    # Rename columns back
    op.alter_column('expenses', 'status', new_column_name='inv_status')
    op.alter_column('expenses', 'expense_date', new_column_name='inv_date')
    op.alter_column('expenses', 'amount', new_column_name='inv_price')
    op.alter_column('expenses', 'description', new_column_name='inv_desc')
    op.alter_column('expenses', 'title', new_column_name='inv_name')
    op.alter_column('expenses', 'expense_id', new_column_name='inv_id')
    
    # Add back old column
    op.add_column('expenses', sa.Column('inv_service', sa.String(length=255), nullable=True))
    
    # Rename table back
    op.rename_table('expenses', 'inventory_management')
    
    # Rename index back
    op.drop_index('ix_expenses_expense_id', table_name='inventory_management')
    op.create_index('ix_inventory_management_inv_id', 'inventory_management', ['inv_id'], unique=False)
