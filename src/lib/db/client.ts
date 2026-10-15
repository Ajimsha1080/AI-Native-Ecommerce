import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import fs from 'fs';

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error('FATAL: DATABASE_URL environment variable is required.');
}
const connectionString: string = rawUrl;

export async function assertDatabaseRoleSecurity(poolInstance?: Pool): Promise<void> {
  const p = poolInstance || pool;
  const result = await p.query(
    'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user'
  );
  if (result.rows.length === 0) {
    throw new Error('FATAL: Unable to verify database role security: current_user not found in pg_roles.');
  }
  const { rolsuper, rolbypassrls } = result.rows[0];
  if (rolsuper || rolbypassrls) {
    throw new Error(
      `FATAL: Insecure database role detected (rolsuper=${rolsuper}, rolbypassrls=${rolbypassrls}). App must run as non-superuser with RLS enforced.`
    );
  }
}

function getSslConfig() {
  const useSsl = process.env.DATABASE_SSL === 'true' || 
    (process.env.NODE_ENV === 'production' && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'));
  
  if (!useSsl) {
    return false;
  }

  let ca: string | undefined = undefined;
  if (process.env.DATABASE_CA_CERT) {
    // If provided as base64 or raw PEM
    ca = process.env.DATABASE_CA_CERT.includes('-----BEGIN CERTIFICATE-----')
      ? process.env.DATABASE_CA_CERT
      : Buffer.from(process.env.DATABASE_CA_CERT, 'base64').toString('ascii');
  } else if (process.env.DATABASE_CA_PATH && fs.existsSync(process.env.DATABASE_CA_PATH)) {
    ca = fs.readFileSync(process.env.DATABASE_CA_PATH, 'utf-8');
  }

  return {
    rejectUnauthorized: true, // Strict SSL verification with CA bundle
    ca,
  };
}

// Global connection pool singleton across Next.js hot-reloads
declare global {
  var __pgPool: Pool | undefined;
}

export const pool = globalThis.__pgPool || new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: getSslConfig()
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pool;
}

export const dbClient = drizzle(pool, { schema });

/**
 * Executes a database operation within an explicit PostgreSQL Row-Level Security (RLS) tenant context.
 * Sets `app.current_tenant` locally within the transaction boundary.
 */
export async function withTenantContext<T>(
  tenantId: string,
  callback: (tx: typeof dbClient) => Promise<T>
): Promise<T> {
  return await dbClient.transaction(async (tx) => {
    if (tenantId) {
      await tx.execute(sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`);
    }
    return await callback(tx as any);
  });
}
