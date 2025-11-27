"""create school_payment_records table

Revision ID: create_school_payment_records
Revises: create_payment_seasons
Create Date: 2025-11-10 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = 'create_school_payment_records'
down_revision = 'create_payment_seasons'
branch_labels = None
depends_on = None


def upgrade():
    # Create school_payment_records table
    op.create_table('school_payment_records',
        sa.Column('record_id', UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', UUID(as_uuid=True), nullable=False),
        sa.Column('payment_id', UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('record_id'),
        sa.ForeignKeyConstraint(['school_id'], ['schools.school_id'], ),
        sa.ForeignKeyConstraint(['payment_id'], ['payment_seasons.pay_id'], )
    )
    op.create_index(op.f('ix_school_payment_records_record_id'), 'school_payment_records', ['record_id'], unique=False)
    op.create_index(op.f('ix_school_payment_records_school_id'), 'school_payment_records', ['school_id'], unique=False)
    op.create_index(op.f('ix_school_payment_records_payment_id'), 'school_payment_records', ['payment_id'], unique=False)


def downgrade():
    # Drop school_payment_records table
    op.drop_index(op.f('ix_school_payment_records_payment_id'), table_name='school_payment_records')
    op.drop_index(op.f('ix_school_payment_records_school_id'), table_name='school_payment_records')
    op.drop_index(op.f('ix_school_payment_records_record_id'), table_name='school_payment_records')
    op.drop_table('school_payment_records')


