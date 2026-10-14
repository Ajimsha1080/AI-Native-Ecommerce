import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import fs from 'fs';

const DEFAULT_LOCAL_URL = 'postgresql://shopmate_app:shopmate_secure_app_pwd_2026@127.0.0.1:5432/aaas_enterprise';
const connectionString = process.env.DATABASE_URL || DEFAULT_LOCAL_URL;

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
