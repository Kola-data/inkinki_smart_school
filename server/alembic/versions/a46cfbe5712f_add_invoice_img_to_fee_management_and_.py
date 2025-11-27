"""add_invoice_img_to_fee_management_and_drop_fee_management_details

Revision ID: a46cfbe5712f
Revises: c40d1c0100ac
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a46cfbe5712f'
down_revision: Union[str, Sequence[str], None] = 'c40d1c0100ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add invoice_img column to fee_management and drop fee_management_details table"""
    from sqlalchemy import inspect
    
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check if fee_management table exists and if invoice_img column already exists
    if 'fee_management' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('fee_management')]
        if 'invoice_img' not in columns:
            op.add_column('fee_management', sa.Column('invoice_img', sa.String(length=500), nullable=True))
    
    # Drop fee_management_details table if it exists
    if 'fee_management_details' in inspector.get_table_names():
        # Drop foreign key constraints first
        try:
            op.drop_constraint('fee_management_details_school_id_fkey', 'fee_management_details', type_='foreignkey')
        except:
            pass
        try:
            op.drop_constraint('fee_management_details_fee_id_fkey', 'fee_management_details', type_='foreignkey')
        except:
            pass
        
        # Drop indexes
        try:
            op.drop_index('idx_fee_detail_status', table_name='fee_management_details')
        except:
            pass
        
        # Drop the table
        op.drop_table('fee_management_details')


def downgrade() -> None:
    """Recreate fee_management_details table and remove invoice_img column"""
    # Recreate fee_management_details table
    op.create_table(
        'fee_management_details',
        sa.Column('fee_detail_id', sa.UUID(), nullable=False),
        sa.Column('school_id', sa.UUID(), nullable=False),
        sa.Column('fee_id', sa.UUID(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('invoice_img', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['fee_id'], ['fee_management.fee_id'], ),
        sa.ForeignKeyConstraint(['school_id'], ['schools.school_id'], ),
        sa.PrimaryKeyConstraint('fee_detail_id')
    )
    op.create_index('idx_fee_detail_status', 'fee_management_details', ['status'], unique=False)
    
    # Remove invoice_img column from fee_management
    op.drop_column('fee_management', 'invoice_img')
