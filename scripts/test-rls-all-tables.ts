import { Pool } from 'pg';

async function runRlsAllTablesTest() {
  console.log('================================================================');
  console.log('🛡️  EXHAUSTIVE ROW LEVEL SECURITY (RLS) VERIFICATION ACROSS ALL TABLES');
  console.log('================================================================');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('FATAL: DATABASE_URL environment variable is required.');
  }
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    // 1. Verify current database user is non-superuser shopmate_app
    const userRes = await client.query('SELECT current_user, session_user, usesuper FROM pg_user WHERE usename = current_user');
    const { current_user, usesuper } = userRes.rows[0];
    console.log(`[DB Auth] Connected user: ${current_user} (Superuser: ${usesuper})`);
    if (usesuper) {
      throw new Error(`SECURITY FATAL: RLS test must run as non-superuser app role, but connected as superuser (${current_user}).`);
    }

    // 2. Discover ALL tables in the schema that contain tenant_id column
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'tenant_id' 
        AND table_schema = 'public'
      ORDER BY table_name;
    `);

    const tenantTables = tablesRes.rows.map(r => r.table_name);
    console.log(`[RLS Discovery] Found ${tenantTables.length} tenant-isolated tables with tenant_id:`);
    tenantTables.forEach(t => console.log(`   - ${t}`));

    if (tenantTables.length === 0) {
      throw new Error('RLS Discovery failed: No tables with tenant_id found in database.');
    }

    // 3. Verify RLS is enabled and forced on EVERY table
    console.log('\n[RLS Enforcement Check] Verifying pg_class rowsecurity and forcerowsecurity flags:');
    for (const table of tenantTables) {
      const rlsCheck = await client.query(`
        SELECT relname, relrowsecurity, relforcerowsecurity 
        FROM pg_class 
        WHERE relname = $1;
      `, [table]);
      const { relrowsecurity, relforcerowsecurity } = rlsCheck.rows[0];
      if (!relrowsecurity || !relforcerowsecurity) {
        throw new Error(`RLS INCOMPLETE: Table '${table}' lacks ENABLE ROW LEVEL SECURITY or FORCE ROW LEVEL SECURITY (rowsec=${relrowsecurity}, force=${relforcerowsecurity}).`);
      }
    }
    console.log(`   ✅ 100% of ${tenantTables.length} tenant tables have ENABLE and FORCE ROW LEVEL SECURITY confirmed.`);

    // 4. Test Cross-Tenant Data Isolation for tenant_alpha vs tenant_beta
    console.log('\n[RLS Isolation Test] Querying as tenant_alpha: asserting 0 rows from tenant_beta across all tables:');
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_tenant', $1, true)", ['tenant_alpha']);

    for (const table of tenantTables) {
      const res = await client.query(`SELECT COUNT(*) as count FROM "${table}" WHERE tenant_id = 'tenant_beta'`);
      const count = parseInt(res.rows[0].count, 10);
      if (count > 0) {
        throw new Error(`RLS LEAK DETECTED: tenant_alpha saw ${count} rows from tenant_beta in table '${table}'!`);
      }
    }
    console.log(`   ✅ Query as tenant_alpha: 0 rows leaked from tenant_beta across all ${tenantTables.length} tables.`);
    await client.query('COMMIT');

    // 5. Test Cross-Tenant Data Isolation for tenant_beta vs tenant_alpha
    console.log('\n[RLS Isolation Test] Querying as tenant_beta: asserting 0 rows from tenant_alpha across all tables:');
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_tenant', $1, true)", ['tenant_beta']);

    for (const table of tenantTables) {
      const res = await client.query(`SELECT COUNT(*) as count FROM "${table}" WHERE tenant_id = 'tenant_alpha'`);
      const count = parseInt(res.rows[0].count, 10);
      if (count > 0) {
        throw new Error(`RLS LEAK DETECTED: tenant_beta saw ${count} rows from tenant_alpha in table '${table}'!`);
      }
    }
    console.log(`   ✅ Query as tenant_beta: 0 rows leaked from tenant_alpha across all ${tenantTables.length} tables.`);
    await client.query('COMMIT');

    // 6. Test Empty Context (Unauthenticated / Missing Tenant Context)
    console.log('\n[RLS Isolation Test] Querying without setting tenant context (fail-closed check):');
    await client.query('BEGIN');
    // Do not set app.current_tenant or set to empty string
    await client.query("SELECT set_config('app.current_tenant', '', true)");

    for (const table of tenantTables) {
      const res = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
      const count = parseInt(res.rows[0].count, 10);
      if (count > 0) {
        throw new Error(`RLS FAIL-OPEN: Unauthenticated/empty tenant context returned ${count} rows in table '${table}'!`);
      }
    }
    console.log(`   ✅ Empty context returned 0 rows across all ${tenantTables.length} tables (Strict Fail-Closed verified).`);
    await client.query('COMMIT');

    console.log('\n================================================================');
    console.log(`🎉 ALL ${tenantTables.length} TABLES VERIFIED: 100% SECURE TENANT ISOLATION`);
    console.log('================================================================\n');

  } finally {
    client.release();
    await pool.end();
  }
}

runRlsAllTablesTest().catch((err) => {
  console.error('\n❌ RLS ALL TABLES VERIFICATION FAILED:', err.message);
  process.exit(1);
});
