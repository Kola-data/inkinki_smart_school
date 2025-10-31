"""merge heads

Revision ID: 9fc6525c4538
Revises: 8f1b3a2c7b1a, e8bd632669ab
Create Date: 2025-10-30 10:08:59.467689

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9fc6525c4538'
down_revision: Union[str, Sequence[str], None] = ('8f1b3a2c7b1a', 'e8bd632669ab')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
