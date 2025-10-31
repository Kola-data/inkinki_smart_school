"""add_school_id_to_assessment_and_exam

Revision ID: 8f1b3a2c7b1a
Revises: 0721a7821927
Create Date: 2025-10-30 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f1b3a2c7b1a'
down_revision: Union[str, Sequence[str], None] = '0721a7821927'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add school_id to assessment_marks and exam_marks, backfill, and add FKs."""
    # assessment_marks
    op.add_column('assessment_marks', sa.Column('school_id', sa.UUID(), nullable=True))
    op.execute(
        """
        UPDATE assessment_marks am
        SET school_id = s.school_id
        FROM students s
        WHERE am.std_id = s.std_id AND am.school_id IS NULL
        """
    )
    op.alter_column('assessment_marks', 'school_id', nullable=False)
    op.create_foreign_key(None, 'assessment_marks', 'schools', ['school_id'], ['school_id'])

    # exam_marks
    op.add_column('exam_marks', sa.Column('school_id', sa.UUID(), nullable=True))
    op.execute(
        """
        UPDATE exam_marks em
        SET school_id = s.school_id
        FROM students s
        WHERE em.std_id = s.std_id AND em.school_id IS NULL
        """
    )
    op.alter_column('exam_marks', 'school_id', nullable=False)
    op.create_foreign_key(None, 'exam_marks', 'schools', ['school_id'], ['school_id'])


def downgrade() -> None:
    """Downgrade schema: drop FKs and remove school_id columns."""
    # exam_marks
    try:
        op.drop_constraint(None, 'exam_marks', type_='foreignkey')
    except Exception:
        pass
    op.drop_column('exam_marks', 'school_id')

    # assessment_marks
    try:
        op.drop_constraint(None, 'assessment_marks', type_='foreignkey')
    except Exception:
        pass
    op.drop_column('assessment_marks', 'school_id')




