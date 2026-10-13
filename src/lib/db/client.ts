import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aaas_enterprise';

// Global connection pool singleton across Next.js hot-reloads
declare global {
  var __pgPool: Pool | undefined;
}

export const pool = globalThis.__pgPool || new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' && !connectionString.includes('localhost') ? { rejectUnauthorized: false } : false
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
