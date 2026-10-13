# ShopMate AaaS — Database Backup & Disaster Recovery Runbook

This document defines the standard operating procedures (SOP) for scheduled automated backups and emergency disaster recovery (DR) of the PostgreSQL 16 (+pgvector) database.

---

## 1. Architecture & Backup Strategy

- **Database Engine**: PostgreSQL 16 with `pgvector` extension.
- **Tables**: Multi-tenant relational schema with Row-Level Security (RLS) policies.
- **Backup Type**: Custom-format compressed binary archive (`pg_dump -F c`).
- **Retention**: Daily automated backups retained locally for 14 days and synced to AWS S3 / Cloud Storage with lifecycle transitions to Glacier after 30 days.

---

## 2. Automated Scheduled Backups

Backups are executed via cron or Kubernetes CronJob using `scripts/db-backup.sh`.

### Crontab Entry (Daily at 02:00 UTC)
```bash
0 2 * * * /var/www/AI-Native-Ecommerce/scripts/db-backup.sh >> /var/log/shopmate-backup.log 2>&1
```

### Manual Backup Execution
```bash
# Via Docker Compose
docker compose exec postgres pg_dump -U postgres -F c -b -v aaas_enterprise > /var/backups/shopmate/manual_backup_$(date +%Y%m%d_%H%M%S).dump

# Via direct shell
POSTGRES_PASSWORD=your_password scripts/db-backup.sh
```

---

## 3. Disaster Recovery & Restore Procedure

In the event of database corruption, accidental tenant data loss, or server replacement, follow this step-by-step procedure:

### Step 1: Pre-Restore Verification & Isolation
1. Stop incoming API traffic by putting the frontend in maintenance mode or scaling down application pods:
   ```bash
   docker compose stop frontend python-backend
   ```
2. Locate the most recent valid backup file:
   ```bash
   ls -la /var/backups/shopmate/
   ```

### Step 2: Database Recreation
1. Drop and recreate the `aaas_enterprise` database:
   ```bash
   docker compose exec postgres dropdb -U postgres --if-exists aaas_enterprise
   docker compose exec postgres createdb -U postgres aaas_enterprise
   ```
2. Ensure the `vector` extension is enabled:
   ```bash
   docker compose exec postgres psql -U postgres -d aaas_enterprise -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```

### Step 3: Archive Restoration
Restore the custom archive using `pg_restore`:
```bash
docker compose exec -T postgres pg_restore \
  -U postgres \
  -d aaas_enterprise \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -v < /var/backups/shopmate/aaas_backup_YYYYMMDD_HHMMSS.dump
```

### Step 4: Schema Migration & Integrity Verification
1. Run Alembic migrations to apply any pending schema changes:
   ```bash
   docker compose run --rm migrate
   ```
2. Validate table row counts and tenant isolation integrity:
   ```bash
   docker compose exec postgres psql -U postgres -d aaas_enterprise -c "
     SELECT schemaname, relname, n_live_tup
     FROM pg_stat_user_tables
     ORDER BY n_live_tup DESC;
   "
   ```
3. Run automated tenant isolation tests:
   ```bash
   npm run test:tenancy
   ```

### Step 5: Resume Application Services
Restart all application services and confirm healthchecks:
```bash
docker compose up -d frontend python-backend
docker compose ps
```

---

## 4. Verification Checklists

- [x] Vector extension present and functional.
- [x] All 26 tenant tables present with foreign keys and indexes.
- [x] Row-Level Security (RLS) enabled on tenant tables.
- [x] Zero mock or fabricated fallback data loaded.
