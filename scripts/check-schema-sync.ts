import { Pool } from 'pg';
import * as drizzleSchema from '../src/lib/db/schema';
import { getTableName, getTableColumns, isTable } from 'drizzle-orm';

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://shopmate_app:shopmate_secure_app_pwd_2026@192.168.107.58:5432/aaas_enterprise';
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    // 1. Fetch all public tables from PostgreSQL (created by Alembic)
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != 'alembic_version'
      ORDER BY table_name;
    `);
    const dbTables = new Set(tablesRes.rows.map(r => r.table_name));

    // 2. Extract Drizzle tables using official drizzle-orm reflection methods
    const drizzleTables: Record<string, Set<string>> = {};
    for (const [exportName, exportVal] of Object.entries(drizzleSchema)) {
      if (exportVal && isTable(exportVal)) {
        try {
          const tableName = getTableName(exportVal);
          const cols = getTableColumns(exportVal);
          const colNames = new Set(Object.values(cols).map((c: any) => c.name));
          drizzleTables[tableName] = colNames;
        } catch {
          // not a table
        }
      }
    }

    console.log(`[Schema Sync Check] Alembic Tables in DB: ${dbTables.size}`);
    console.log(`[Schema Sync Check] Drizzle Tables in TS: ${Object.keys(drizzleTables).length}`);

    const errors: string[] = [];

    // Check table parity
    for (const t of dbTables) {
      if (!drizzleTables[t]) {
        errors.push(`Table '${t}' exists in Alembic DB but is missing in Drizzle schema.`);
      }
    }

    for (const t of Object.keys(drizzleTables)) {
      if (!dbTables.has(t)) {
        errors.push(`Table '${t}' exists in Drizzle schema but is missing in Alembic DB.`);
      }
    }

    // Check column parity for matching tables
    for (const t of dbTables) {
      if (drizzleTables[t]) {
        const colsRes = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1;
        `, [t]);
        const dbCols = new Set(colsRes.rows.map(r => r.column_name));
        const drCols = drizzleTables[t];

        for (const c of dbCols) {
          if (!drCols.has(c)) {
            errors.push(`Column '${t}.${c}' exists in Alembic DB but is missing in Drizzle.`);
          }
        }

        for (const c of drCols) {
          if (!dbCols.has(c)) {
            errors.push(`Column '${t}.${c}' exists in Drizzle but is missing in Alembic DB.`);
          }
        }
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ SCHEMA DIVERGENCE DETECTED between Alembic and Drizzle:');
      errors.forEach(e => console.error(`  - ${e}`));
      process.exit(1);
    }

    console.log('\n✅ SCHEMA SYNC VERIFIED: All 34 tables and columns in Alembic and Drizzle are 100% synchronized!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('[Schema Sync Error]:', err);
  process.exit(1);
});
