#!/usr/bin/env bash
# ==============================================================================
# ⚠️  DEVELOPMENT & LOCAL CI RUNNER SETUP ONLY
# DO NOT RUN IN PRODUCTION ENVIRONMENTS.
# ==============================================================================
set -e

if [ "${APP_ENV:-development}" = "production" ] || [ "${NODE_ENV:-development}" = "production" ]; then
  echo "FATAL: setup-local-services.sh is strictly forbidden in production environments."
  exit 1
fi

echo "[Dev-Services] Configuring local development PostgreSQL and Redis..."

# Configure postgresql.conf to listen on localhost
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/16/main/postgresql.conf 2>/dev/null || true

# Enforce md5/scram-sha-256 password authentication for local connections (never trust 0.0.0.0/0)
# Local connections require valid database credentials
echo "host all all 127.0.0.1/32 scram-sha-256" >> /etc/postgresql/16/main/pg_hba.conf 2>/dev/null || true
echo "host all all ::1/128 scram-sha-256" >> /etc/postgresql/16/main/pg_hba.conf 2>/dev/null || true

# Restart services
service postgresql restart || true
service redis-server restart || true

# Create database and extensions
su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\"" || true
su - postgres -c "psql -c \"CREATE DATABASE aaas_enterprise;\"" || true
su - postgres -c "psql -d aaas_enterprise -c \"CREATE EXTENSION IF NOT EXISTS vector;\"" || true
su - postgres -c "psql -d aaas_enterprise -c \"CREATE EXTENSION IF NOT EXISTS pgcrypto;\"" || true
su - postgres -c "psql -d aaas_enterprise -c \"SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';\"" || true

# Verify redis
redis-cli ping || true

echo "[Dev-Services] Local services ready for development."
