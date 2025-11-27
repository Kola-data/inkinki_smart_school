"""add_missing_test_marks_and_password_resets_tables

Revision ID: 694554559f46
Revises: 1d6f3083df66
Create Date: 2025-11-09 13:02:30.540346

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '694554559f46'
down_revision: Union[str, Sequence[str], None] = '1d6f3083df66'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add missing test_marks and password_resets tables."""
    # Create password_resets table
    op.create_table('password_resets',
    sa.Column('reset_id', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('verification_code', sa.String(length=6), nullable=False),
    sa.Column('is_used', sa.Boolean(), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('reset_id')
    )
    op.create_index(op.f('ix_password_resets_email'), 'password_resets', ['email'], unique=False)
    op.create_index(op.f('ix_password_resets_reset_id'), 'password_resets', ['reset_id'], unique=False)
    
    # Create test_marks table
    op.create_table('test_marks',
    sa.Column('test_mark_id', sa.UUID(), nullable=False),
    sa.Column('school_id', sa.UUID(), nullable=False),
    sa.Column('std_id', sa.UUID(), nullable=False),
    sa.Column('subj_id', sa.UUID(), nullable=False),
    sa.Column('cls_id', sa.UUID(), nullable=False),
    sa.Column('academic_id', sa.UUID(), nullable=False),
    sa.Column('term', sa.String(length=50), nullable=False),
    sa.Column('test_avg_mark', sa.Float(), nullable=True),
    sa.Column('test_mark', sa.Float(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=True),
    sa.Column('is_published', sa.Boolean(), nullable=True),
    sa.Column('is_deleted', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['academic_id'], ['academic_years.academic_id'], ),
    sa.ForeignKeyConstraint(['cls_id'], ['classes.cls_id'], ),
    sa.ForeignKeyConstraint(['school_id'], ['schools.school_id'], ),
    sa.ForeignKeyConstraint(['std_id'], ['students.std_id'], ),
    sa.ForeignKeyConstraint(['subj_id'], ['subjects.subj_id'], ),
    sa.PrimaryKeyConstraint('test_mark_id')
    )
    op.create_index(op.f('ix_test_marks_academic_id'), 'test_marks', ['academic_id'], unique=False)
    op.create_index(op.f('ix_test_marks_cls_id'), 'test_marks', ['cls_id'], unique=False)
    op.create_index(op.f('ix_test_marks_school_id'), 'test_marks', ['school_id'], unique=False)
    op.create_index(op.f('ix_test_marks_std_id'), 'test_marks', ['std_id'], unique=False)
    op.create_index(op.f('ix_test_marks_subj_id'), 'test_marks', ['subj_id'], unique=False)
    op.create_index(op.f('ix_test_marks_test_mark_id'), 'test_marks', ['test_mark_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema - Remove test_marks and password_resets tables."""
    op.drop_index(op.f('ix_test_marks_test_mark_id'), table_name='test_marks')
    op.drop_index(op.f('ix_test_marks_subj_id'), table_name='test_marks')
    op.drop_index(op.f('ix_test_marks_std_id'), table_name='test_marks')
    op.drop_index(op.f('ix_test_marks_school_id'), table_name='test_marks')
    op.drop_index(op.f('ix_test_marks_cls_id'), table_name='test_marks')
    op.drop_index(op.f('ix_test_marks_academic_id'), table_name='test_marks')
    op.drop_table('test_marks')
    op.drop_index(op.f('ix_password_resets_reset_id'), table_name='password_resets')
    op.drop_index(op.f('ix_password_resets_email'), table_name='password_resets')
    op.drop_table('password_resets')
