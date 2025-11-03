"""add_phone_to_staff

Revision ID: 9f712537dead
Revises: 2a7f1c4a1f3b
Create Date: 2025-11-02 13:07:35.439742

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9f712537dead'
down_revision: Union[str, Sequence[str], None] = '2a7f1c4a1f3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add phone column to staff table."""
    # Check if column already exists before adding
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('staff')]
    
    if 'phone' not in columns:
        op.add_column('staff', sa.Column('phone', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Downgrade schema - Remove phone column from staff table."""
    # Check if column exists before dropping
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('staff')]
    
    if 'phone' in columns:
        op.drop_column('staff', 'phone')
