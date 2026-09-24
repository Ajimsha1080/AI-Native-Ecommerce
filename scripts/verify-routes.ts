async function verifyRoutes() {
  const routes = [
    '/',
    '/dashboard',
    '/agents',
    '/agents/new',
    '/agents/agent_shopmate_01',
    '/agents/agent_shopmate_01/playground',
    '/agents/agent_shopmate_01/design',
    '/agents/agent_shopmate_01/knowledge',
    '/agents/agent_shopmate_01/commerce',
    '/agents/agent_shopmate_01/tools',
    '/agents/agent_shopmate_01/rules',
    '/agents/agent_shopmate_01/memory',
    '/agents/agent_shopmate_01/evaluations',
    '/agents/agent_shopmate_01/versions',
    '/agents/agent_shopmate_01/deploy',
    '/agents/agent_shopmate_01/conversations',
    '/agents/agent_shopmate_01/analytics',
    '/products',
    '/actions',
    '/search',
    '/security',
    '/team',
    '/conversations',
    '/knowledge',
    '/integrations',
    '/deployments',
    '/analytics',
    '/api-keys',
    '/billing',
    '/settings',
    '/admin',
    '/embed/dep_live_widget_01'
  ];

  console.log('Testing ' + routes.length + ' application routes against http://localhost:3000 ...\n');
  let ok = 0;
  for (const r of routes) {
    try {
      const res = await fetch('http://localhost:3000' + r);
      if (res.status === 200) {
        ok++;
        console.log(`[PASS] ${r} -> 200 OK`);
      } else {
        console.log(`[FAIL] ${r} -> Status ${res.status}`);
      }
    } catch (e: any) {
      console.log(`[FAIL] ${r} -> Error: ${e.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${ok}/${routes.length} ROUTES VERIFIED 200 OK`);
  console.log(`========================================`);
}

verifyRoutes();
