#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'shopmate_migrator') THEN
            CREATE ROLE shopmate_migrator WITH SUPERUSER LOGIN PASSWORD '${MIGRATOR_DB_PASSWORD:-shopmate_secure_migrator_pwd_2026}';
        ELSE
            ALTER ROLE shopmate_migrator WITH SUPERUSER LOGIN PASSWORD '${MIGRATOR_DB_PASSWORD:-shopmate_secure_migrator_pwd_2026}';
        END IF;

        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'shopmate_app') THEN
            CREATE ROLE shopmate_app WITH NOSUPERUSER NOBYPASSRLS LOGIN PASSWORD '${APP_DB_PASSWORD:-shopmate_secure_app_pwd_2026}';
        ELSE
            ALTER ROLE shopmate_app WITH NOSUPERUSER NOBYPASSRLS LOGIN PASSWORD '${APP_DB_PASSWORD:-shopmate_secure_app_pwd_2026}';
        END IF;
    END
    \$\$;

    GRANT ALL ON DATABASE "$POSTGRES_DB" TO shopmate_migrator;
    GRANT ALL ON DATABASE "$POSTGRES_DB" TO shopmate_app;
EOSQL
