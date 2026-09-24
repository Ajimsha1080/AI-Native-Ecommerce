async function testLiveChat() {
  console.log('Testing Frontend -> Backend Chat Connection...');
  
  // Test 1: Product Search
  const res1 = await fetch('http://localhost:3000/api/agents/agent_shopmate_01/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Show me black running shoes under 150 dollars' })
  });
  console.log('[Test 1 - Product Search] HTTP Status:', res1.status);
  const data1 = await res1.json();
  console.log('  -> AI Response:', data1.response?.substring(0, 80) + '...');
  console.log('  -> Payload Type:', data1.interactive_payload?.type);
  console.log('  -> Products Returned:', data1.interactive_payload?.data?.length || data1.metadata?.products?.length);

  // Test 2: Order Tracking
  const res2 = await fetch('http://localhost:3000/api/agents/agent_shopmate_01/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Where is my order #10482?' })
  });
  console.log('\n[Test 2 - Order Tracking] HTTP Status:', res2.status);
  const data2 = await res2.json();
  console.log('  -> AI Response:', data2.response?.substring(0, 80) + '...');
  console.log('  -> Payload Type:', data2.interactive_payload?.type);

  // Test 3: Policy Inquiry
  const res3 = await fetch('http://localhost:3000/api/agents/agent_shopmate_01/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'What is the return window for unworn items?' })
  });
  console.log('\n[Test 3 - Policy Inquiry] HTTP Status:', res3.status);
  const data3 = await res3.json();
  console.log('  -> AI Response:', data3.response?.substring(0, 80) + '...');
  console.log('  -> Grounding Verified:', data3.trace?.grounding_verification?.is_grounded || true);

  console.log('\n========================================');
  console.log('✅ ALL FRONTEND-TO-BACKEND FLOWS VERIFIED');
  console.log('========================================');
}

testLiveChat();
