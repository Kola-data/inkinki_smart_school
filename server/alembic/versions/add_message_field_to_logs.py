"""add message field to logs

Revision ID: add_message_to_logs
Revises: 
Create Date: 2025-11-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_message_to_logs'
down_revision = '2791bf0b7e2f'  # Latest revision: create_system_users_table
branch_labels = None
depends_on = None


def upgrade():
    # Add message column to logs table
    op.add_column('logs', sa.Column('message', sa.Text(), nullable=True))


def downgrade():
    # Remove message column from logs table
    op.drop_column('logs', 'message')

