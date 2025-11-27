"""create_system_users_table

Revision ID: 2791bf0b7e2f
Revises: 1e0c696dcb69
Create Date: 2025-11-09 13:15:34.128672

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2791bf0b7e2f'
down_revision: Union[str, Sequence[str], None] = '1e0c696dcb69'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Create system_users table."""
    # Create enum types if they don't exist
    op.execute("""
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
                CREATE TYPE userrole AS ENUM ('SUPER_ADMIN', 'FINANCE_ADMIN', 'ACADEMIC_ADMIN');
            END IF;
        END $$;
    """)
    
    op.execute("""
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'accountstatus') THEN
                CREATE TYPE accountstatus AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');
            END IF;
        END $$;
    """)
    
    # Create system_users table using raw SQL to avoid enum creation issues
    op.execute("""
        CREATE TABLE IF NOT EXISTS system_users (
            user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name VARCHAR(255) NOT NULL,
            username VARCHAR(100) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            phone_number VARCHAR(20),
            profile_image VARCHAR(500),
            password VARCHAR(255) NOT NULL,
            role userrole NOT NULL DEFAULT 'ACADEMIC_ADMIN',
            last_login TIMESTAMP WITH TIME ZONE,
            account_status accountstatus NOT NULL DEFAULT 'ACTIVE',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE,
            created_by UUID REFERENCES system_users(user_id),
            device_ip_logs JSONB
        );
    """)
    
    # Create indexes
    op.create_index('ix_system_users_user_id', 'system_users', ['user_id'], unique=False)
    op.create_index('ix_system_users_username', 'system_users', ['username'], unique=True)
    op.create_index('ix_system_users_email', 'system_users', ['email'], unique=True)


def downgrade() -> None:
    """Downgrade schema - Drop system_users table."""
    op.drop_index('ix_system_users_email', table_name='system_users')
    op.drop_index('ix_system_users_username', table_name='system_users')
    op.drop_index('ix_system_users_user_id', table_name='system_users')
    op.drop_table('system_users')
    
    # Note: We don't drop enum types as they might be used elsewhere
