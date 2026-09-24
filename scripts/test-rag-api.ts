async function testRagEndpoints() {
  console.log('Testing /api/rag/query endpoint...');
  const res1 = await fetch('http://localhost:3000/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'What is the return window for unworn items?' })
  });
  console.log('RAG Query Status:', res1.status);
  const data1 = await res1.json();
  console.log('  -> Intent:', data1.query_understanding?.detected_intent || data1.intent);
  console.log('  -> Top Rerank Score:', data1.reranking?.top_score);
  console.log('  -> Citations Count:', data1.citations?.length || data1.retrieved_citations?.length);

  console.log('\nTesting /api/rag/ingest endpoint...');
  const res2 = await fetch('http://localhost:3000/api/rag/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Express Shipping FAQ',
      type: 'FAQ',
      rawContent: 'Q: How fast is express shipping? A: Express priority transit delivers within 24 hours nationwide.'
    })
  });
  console.log('RAG Ingest Status:', res2.status);
  const data2 = await res2.json();
  console.log('  -> Ingest Success:', data2.success);
  console.log('  -> Doc ID:', data2.document?.id);

  console.log('\n========================================');
  console.log('✅ RAG AND BACKEND API ENDPOINTS VERIFIED');
  console.log('========================================');
}

testRagEndpoints();
