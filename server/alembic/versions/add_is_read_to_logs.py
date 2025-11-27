"""add is_read field to logs

Revision ID: add_is_read_to_logs
Revises: add_is_fixed_to_logs
Create Date: 2025-11-10 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_is_read_to_logs'
down_revision = 'add_is_fixed_to_logs'
branch_labels = None
depends_on = None


def upgrade():
    # Add is_read column to logs table
    op.add_column('logs', sa.Column('is_read', sa.Boolean(), nullable=True, server_default='false'))


def downgrade():
    # Remove is_read column from logs table
    op.drop_column('logs', 'is_read')



