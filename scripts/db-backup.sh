#!/bin/bash
# ==============================================================================
# ShopMate AaaS — Automated PostgreSQL Backup Script
# Performs compressed, timestamped pg_dump of PostgreSQL 16 database.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/shopmate}"
DATE_TAG=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/aaas_backup_${DATE_TAG}.dump"
DB_NAME="${POSTGRES_DB:-aaas_enterprise}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -Iseconds)] Starting backup of ${DB_NAME} on ${DB_HOST}:${DB_PORT}..."

# Execute binary custom format dump with pgvector embeddings preserved
PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -F c \
  -b \
  -v \
  -f "${BACKUP_FILE}" \
  "${DB_NAME}"

echo "[$(date -Iseconds)] Backup complete: ${BACKUP_FILE}"

# Keep latest 14 daily backups, delete older
find "${BACKUP_DIR}" -name "aaas_backup_*.dump" -mtime +14 -delete
echo "[$(date -Iseconds)] Cleaned backups older than 14 days."
