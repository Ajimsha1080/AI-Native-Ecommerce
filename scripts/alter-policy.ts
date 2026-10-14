import { Pool } from 'pg';

async function main() {
  const superPool = new Pool({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/aaas_enterprise'
  });
  await superPool.query(`
    ALTER POLICY workspace_members_tenant_isolation ON workspace_members 
    USING (
      tenant_id = current_setting('app.current_tenant', true) 
      OR current_setting('app.allow_membership_lookup', true) = 'true'
    ) 
    WITH CHECK (
      tenant_id = current_setting('app.current_tenant', true)
    );
  `);
  console.log('ALTER POLICY workspace_members SUCCESS!');
  await superPool.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
