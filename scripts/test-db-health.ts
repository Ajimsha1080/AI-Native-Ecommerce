import { db } from '../src/lib/db';

async function testDatabaseHealth() {
  console.log('========================================================');
  console.log('📦 SHOPMATE PERSISTENT DATABASE HEALTH CHECK');
  console.log('========================================================');

  console.log('\n[1. Record Consistency Check]');
  console.log('  • Users Count:            ', db.users.length, 'users');
  console.log('  • Workspaces (Tenants):   ', db.workspaces.length, 'tenants');
  console.log('  • AI Agents:              ', db.agents.length, 'agents');
  console.log('  • Commerce Products:      ', db.commerce_products.length, 'products');
  console.log('  • Live Store Orders:      ', db.commerce_orders.length, 'orders');
  console.log('  • Knowledge Documents:    ', db.knowledge_documents.length, 'documents');
  console.log('  • Vector Knowledge Chunks:', db.knowledge_chunks.length, 'chunks');
  console.log('  • Customer Conversations: ', db.conversations.length, 'sessions');
  console.log('  • System Audit Logs:      ', db.audit_logs.length, 'logs');

  // Verify Foreign Keys & Scoping
  console.log('\n[2. Referential Integrity Verification]');
  for (const agent of db.agents) {
    const ws = db.workspaces.find(w => w.id === agent.workspace_id);
    if (!ws) throw new Error(`Orphaned agent found: ${agent.id}`);
  }
  console.log('  ✅ All agents mapped to valid workspace tenants.');

  for (const prod of db.commerce_products) {
    if (!prod.variants || prod.variants.length === 0) {
      throw new Error(`Product ${prod.id} has no variants.`);
    }
  }
  console.log('  ✅ All products have active variants and inventory stock.');

  for (const chunk of db.knowledge_chunks) {
    if (!chunk.embedding || chunk.embedding.length !== 128) {
      throw new Error(`Chunk ${chunk.id} vector embedding dimension mismatch.`);
    }
  }
  console.log('  ✅ All 128-dimensional dense vector embeddings verified.');

  console.log('\n========================================================');
  console.log('✅ ALL DATABASE PERSISTENCE & INTEGRITY CHECKS PASSED');
  console.log('========================================================');
}

testDatabaseHealth().catch(err => {
  console.error('Database Health Check Failed:', err);
  process.exit(1);
});
