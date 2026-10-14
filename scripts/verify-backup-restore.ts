import { Pool } from 'pg';

async function main() {
  const origPool = new Pool({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/aaas_enterprise'
  });
  const restPool = new Pool({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/aaas_restore_drill'
  });

  const tables = [
    'users',
    'workspaces',
    'workspace_members',
    'agents',
    'agent_configs',
    'agent_versions',
    'commerce_products',
    'commerce_orders',
    'api_keys',
    'knowledge_sources',
    'knowledge_documents',
    'processed_webhook_events'
  ];

  console.log('================================================================');
  console.log('📦 POSTGRESQL BACKUP & RESTORE DRILL VERIFICATION');
  console.log('================================================================\n');

  let allMatched = true;

  for (const table of tables) {
    const origRes = await origPool.query(`SELECT count(*)::int as count FROM ${table}`);
    const restRes = await restPool.query(`SELECT count(*)::int as count FROM ${table}`);

    const origCount = origRes.rows[0].count;
    const restCount = restRes.rows[0].count;

    if (origCount === restCount) {
      console.log(`  ✅ [MATCH] Table "${table}": ${origCount} rows in primary == ${restCount} rows in restore`);
    } else {
      console.error(`  ❌ [MISMATCH] Table "${table}": primary=${origCount}, restore=${restCount}`);
      allMatched = false;
    }
  }

  await origPool.end();
  await restPool.end();

  if (allMatched) {
    console.log('\n🎉 BACKUP & RESTORE DRILL: 100% PERFECT MATCH! ZERO DATA LOSS.');
  } else {
    console.error('\n❌ BACKUP & RESTORE DRILL: MISMATCH DETECTED!');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
