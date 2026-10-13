import { test, expect } from '@playwright/test';

test.describe('Commerce & Checkout API Flows', () => {
  test('Order creation rejects requests without required product payload', async ({ request }) => {
    const res = await request.post('/api/commerce/checkout/commit', {
      data: {
        quantity: 1
      }
    });
    // Missing productId must be rejected with 400 or fail-closed (401/403/500)
    expect([400, 401, 403, 500]).toContain(res.status());
  });

  test('Razorpay order creation endpoint fails closed when gateway keys or parameters are missing', async ({ request }) => {
    const res = await request.post('/api/commerce/razorpay/create-order', {
      data: {
        amount: 500
      }
    });
    // Never returns a fabricated sandbox fake order; returns 400, 401, 502, or 503
    expect([400, 401, 403, 502, 503]).toContain(res.status());
    const data = await res.json();
    if (res.status() >= 400) {
      expect(data.error).toBeDefined();
    }
  });
});
