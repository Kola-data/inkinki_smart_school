"""fix_fee_management_status_column_type

Revision ID: f97561774eac
Revises: 9f712537dead
Create Date: 2025-11-04 15:00:33.619953

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f97561774eac'
down_revision: Union[str, Sequence[str], None] = '9f712537dead'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Check if status column is integer and convert it to string
    # This migration handles cases where the previous migration didn't run correctly
    connection = op.get_bind()
    
    # Get current column type
    result = connection.execute(sa.text("""
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'fee_management' AND column_name = 'status'
    """))
    row = result.fetchone()
    
    if row and row[0] == 'integer':
        # First, change column type using USING clause to convert integer to text
        # Then map integer values to string equivalents
        connection.execute(sa.text("""
            ALTER TABLE fee_management 
            ALTER COLUMN status TYPE VARCHAR(50) 
            USING CASE 
                WHEN status = 0 THEN 'pending'
                WHEN status = 1 THEN 'paid'
                WHEN status = 2 THEN 'overdue'
                WHEN status = 3 THEN 'partial'
                ELSE 'pending'
            END
        """))
        
        # Make it NOT NULL
        connection.execute(sa.text("""
            ALTER TABLE fee_management 
            ALTER COLUMN status SET NOT NULL
        """))


def downgrade() -> None:
    """Downgrade schema."""
    # Convert string status back to integer
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE fee_management 
        SET status = CASE 
            WHEN status = 'pending' THEN '0'
            WHEN status = 'paid' THEN '1'
            WHEN status = 'overdue' THEN '2'
            WHEN status = 'partial' THEN '3'
            ELSE '0'
        END
    """))
    
    op.alter_column('fee_management', 'status',
                   existing_type=sa.String(length=50),
                   type_=sa.INTEGER(),
                   nullable=True)
