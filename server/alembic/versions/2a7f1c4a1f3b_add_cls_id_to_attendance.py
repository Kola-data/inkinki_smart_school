"""add cls_id to students_attendance

Revision ID: 2a7f1c4a1f3b
Revises: 9fc6525c4538
Create Date: 2025-10-30 10:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2a7f1c4a1f3b'
down_revision: Union[str, Sequence[str], None] = '9fc6525c4538'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('students_attendance', sa.Column('cls_id', sa.UUID(), nullable=True))
    op.create_foreign_key(None, 'students_attendance', 'classes', ['cls_id'], ['cls_id'])


def downgrade() -> None:
    try:
        op.drop_constraint(None, 'students_attendance', type_='foreignkey')
    except Exception:
        pass
    op.drop_column('students_attendance', 'cls_id')




