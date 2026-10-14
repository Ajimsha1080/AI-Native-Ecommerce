import { dbClient, withTenantContext, pool } from './client';
import * as schema from './schema';
import { repositories } from './repositories';

export { dbClient, withTenantContext, pool, schema };
export const db = repositories;
export function getDatabase() {
  return repositories;
}
export default db;
