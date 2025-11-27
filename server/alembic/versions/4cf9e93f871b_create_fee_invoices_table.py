"""create_fee_invoices_table

Revision ID: 4cf9e93f871b
Revises: a46cfbe5712f
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID


# revision identifiers, used by Alembic.
revision: str = '4cf9e93f871b'
down_revision: Union[str, Sequence[str], None] = 'a46cfbe5712f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create fee_invoices table"""
    op.create_table(
        'fee_invoices',
        sa.Column('invoice_id', PostgresUUID(as_uuid=True), primary_key=True),
        sa.Column('fee_id', PostgresUUID(as_uuid=True), nullable=False),
        sa.Column('school_id', PostgresUUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('invoice_img', sa.String(length=500), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['fee_id'], ['fee_management.fee_id'], ),
        sa.ForeignKeyConstraint(['school_id'], ['schools.school_id'], ),
        sa.PrimaryKeyConstraint('invoice_id')
    )
    op.create_index('idx_fee_invoice_fee_id', 'fee_invoices', ['fee_id'], unique=False)
    op.create_index('idx_fee_invoice_school_id', 'fee_invoices', ['school_id'], unique=False)
    op.create_index(op.f('ix_fee_invoices_invoice_id'), 'fee_invoices', ['invoice_id'], unique=False)


def downgrade() -> None:
    """Drop fee_invoices table"""
    op.drop_index(op.f('ix_fee_invoices_invoice_id'), table_name='fee_invoices')
    op.drop_index('idx_fee_invoice_school_id', table_name='fee_invoices')
    op.drop_index('idx_fee_invoice_fee_id', table_name='fee_invoices')
    op.drop_table('fee_invoices')

