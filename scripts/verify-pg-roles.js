const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const roles = await pool.query(
      `SELECT rolname, rolsuper, rolbypassrls, rolcanlogin 
       FROM pg_roles 
       WHERE rolname IN ('shopmate_app', 'shopmate_migrator', 'postgres') 
       ORDER BY rolname;`
    );
    console.log('=== PG ROLES AUDIT ===');
    console.table(roles.rows);

    const rls = await pool.query(
      `SELECT relname AS table_name, relrowsecurity AS rls_enabled, relforcerowsecurity AS force_rls
       FROM pg_class
       WHERE relname IN (
         'users', 'workspaces', 'workspace_members', 'agents', 'agent_configs',
         'agent_versions', 'commerce_products', 'commerce_orders', 'api_keys',
         'knowledge_sources', 'knowledge_documents', 'knowledge_chunks', 'tools'
       )
       ORDER BY table_name;`
    );
    console.log('=== RLS AUDIT ===');
    console.table(rls.rows);

    const embedding = await pool.query(
      `SELECT column_name, data_type, udt_name 
       FROM information_schema.columns 
       WHERE table_name = 'commerce_products' AND column_name = 'embedding';`
    );
    console.log('=== VECTOR(1536) EMBEDDING AUDIT ===');
    console.table(embedding.rows);

    const toolsPk = await pool.query(
      `SELECT kcu.column_name, tc.constraint_name, tc.constraint_type
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_name = kcu.table_name
       WHERE tc.table_name = 'tools' AND tc.constraint_type = 'PRIMARY KEY';`
    );
    console.log('=== TOOLS COMPOSITE PRIMARY KEY AUDIT ===');
    console.table(toolsPk.rows);

    const vectorIndex = await pool.query(
      `SELECT indexname, indexdef 
       FROM pg_indexes 
       WHERE tablename = 'commerce_products' AND indexname LIKE '%embedding%';`
    );
    console.log('=== VECTOR HNSW/IVFFLAT INDEX AUDIT ===');
    console.table(vectorIndex.rows);

    const startupAssertion = await pool.query(
      `SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;`
    );
    console.log('=== RUNTIME CURRENT_USER RLS ASSERTION ===');
    console.table(startupAssertion.rows);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
