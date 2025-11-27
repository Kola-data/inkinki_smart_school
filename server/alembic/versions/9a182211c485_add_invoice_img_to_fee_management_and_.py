"""add_invoice_img_to_fee_management_and_drop_fee_details_table

Revision ID: 9a182211c485
Revises: c40d1c0100ac
Create Date: 2025-11-04 21:07:01.583076

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a182211c485'
down_revision: Union[str, Sequence[str], None] = 'c40d1c0100ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
