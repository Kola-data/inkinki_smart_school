"""add_inventory_management_and_fee_management_details_tables

Revision ID: 1e0c696dcb69
Revises: 694554559f46
Create Date: 2025-11-09 13:04:30.011442

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e0c696dcb69'
down_revision: Union[str, Sequence[str], None] = '694554559f46'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add inventory_management and fee_management_details tables."""
    # Create inventory_management table
    op.create_table('inventory_management',
    sa.Column('inv_id', sa.UUID(), nullable=False),
    sa.Column('school_id', sa.UUID(), nullable=False),
    sa.Column('inv_name', sa.String(length=255), nullable=False),
    sa.Column('inv_service', sa.String(length=255), nullable=True),
    sa.Column('inv_desc', sa.Text(), nullable=True),
    sa.Column('inv_date', sa.Date(), nullable=True),
    sa.Column('inv_price', sa.Float(), nullable=True),
    sa.Column('inv_status', sa.String(length=50), nullable=True),
    sa.Column('is_deleted', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['school_id'], ['schools.school_id'], ),
    sa.PrimaryKeyConstraint('inv_id')
    )
    op.create_index(op.f('ix_inventory_management_inv_id'), 'inventory_management', ['inv_id'], unique=False)
    op.create_index(op.f('ix_inventory_management_school_id'), 'inventory_management', ['school_id'], unique=False)
    
    # Create fee_management_details table
    op.create_table('fee_management_details',
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
    op.create_index(op.f('ix_fee_management_details_fee_detail_id'), 'fee_management_details', ['fee_detail_id'], unique=False)
    op.create_index(op.f('ix_fee_management_details_fee_id'), 'fee_management_details', ['fee_id'], unique=False)
    op.create_index(op.f('ix_fee_management_details_school_id'), 'fee_management_details', ['school_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema - Remove inventory_management and fee_management_details tables."""
    op.drop_index(op.f('ix_fee_management_details_school_id'), table_name='fee_management_details')
    op.drop_index(op.f('ix_fee_management_details_fee_id'), table_name='fee_management_details')
    op.drop_index(op.f('ix_fee_management_details_fee_detail_id'), table_name='fee_management_details')
    op.drop_index('idx_fee_detail_status', table_name='fee_management_details')
    op.drop_table('fee_management_details')
    op.drop_index(op.f('ix_inventory_management_school_id'), table_name='inventory_management')
    op.drop_index(op.f('ix_inventory_management_inv_id'), table_name='inventory_management')
    op.drop_table('inventory_management')
