"""create_roles_shopmate_app_and_shopmate_migrator

Revision ID: 000_roles
Revises: 
Create Date: 2026-10-15 00:00:00.000000

"""
from typing import Sequence, Union
import os
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '000_roles'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    app_pwd = os.getenv("APP_DB_PASSWORD", "shopmate_secure_app_pwd_2026")
    migrator_pwd = os.getenv("MIGRATOR_DB_PASSWORD", "shopmate_migrator_secure_pwd_2026")

    # 1. Create shopmate_app as non-superuser, non-bypassrls role before any tables or grants
    op.execute(f"""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'shopmate_app') THEN
            CREATE ROLE shopmate_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '{app_pwd}';
        ELSE
            ALTER ROLE shopmate_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '{app_pwd}';
        END IF;
    END
    $$;
    """)

    # 2. Create shopmate_migrator role used exclusively by the migration service
    op.execute(f"""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'shopmate_migrator') THEN
            CREATE ROLE shopmate_migrator WITH LOGIN SUPERUSER CREATEDB CREATEROLE PASSWORD '{migrator_pwd}';
        ELSE
            ALTER ROLE shopmate_migrator WITH LOGIN SUPERUSER CREATEDB CREATEROLE PASSWORD '{migrator_pwd}';
        END IF;
    END
    $$;
    """)

    # 3. Base schema privileges for shopmate_app
    op.execute("""
    DO $$
    BEGIN
        GRANT USAGE ON SCHEMA public TO shopmate_app;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO shopmate_app;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO shopmate_app;
    END
    $$;
    """)

def downgrade() -> None:
    op.execute("""
    DO $$
    BEGIN
        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM shopmate_app;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM shopmate_app;
        REVOKE USAGE ON SCHEMA public FROM shopmate_app;
    END
    $$;
    """)
