"""merge_fee_management_and_expenses_heads

Revision ID: 1d6f3083df66
Revises: 9a182211c485, add_academic_expenses_pagination
Create Date: 2025-11-09 13:02:03.409888

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1d6f3083df66'
down_revision: Union[str, Sequence[str], None] = ('9a182211c485', 'add_academic_expenses_pagination')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
