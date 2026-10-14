#!/usr/bin/env bash
set -e

# Configure postgresql.conf to listen on all interfaces
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf

# Configure pg_hba.conf to trust local network connections for dev/CI
echo "host all all 0.0.0.0/0 trust" >> /etc/postgresql/16/main/pg_hba.conf
echo "host all all ::0/0 trust" >> /etc/postgresql/16/main/pg_hba.conf

# Restart services
service postgresql restart
service redis-server restart

# Create database and extensions
su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\"" || true
su - postgres -c "psql -c \"CREATE DATABASE aaas_enterprise;\"" || true
su - postgres -c "psql -d aaas_enterprise -c \"CREATE EXTENSION IF NOT EXISTS vector;\""
su - postgres -c "psql -d aaas_enterprise -c \"CREATE EXTENSION IF NOT EXISTS pgcrypto;\""
su - postgres -c "psql -d aaas_enterprise -c \"SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';\""

# Verify redis
redis-cli ping
