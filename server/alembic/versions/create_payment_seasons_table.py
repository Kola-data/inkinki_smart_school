"""create payment_seasons table

Revision ID: create_payment_seasons
Revises: add_is_read_to_logs
Create Date: 2025-11-10 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = 'create_payment_seasons'
down_revision = 'add_is_read_to_logs'
branch_labels = None
depends_on = None


def upgrade():
    # Create payment_seasons table
    op.create_table('payment_seasons',
        sa.Column('pay_id', UUID(as_uuid=True), nullable=False),
        sa.Column('season_pay_name', sa.String(length=255), nullable=False),
        sa.Column('from_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('coupon_number', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('pay_id')
    )
    op.create_index(op.f('ix_payment_seasons_pay_id'), 'payment_seasons', ['pay_id'], unique=False)


def downgrade():
    # Drop payment_seasons table
    op.drop_index(op.f('ix_payment_seasons_pay_id'), table_name='payment_seasons')
    op.drop_table('payment_seasons')


