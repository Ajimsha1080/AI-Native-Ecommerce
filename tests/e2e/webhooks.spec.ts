import { test, expect } from '@playwright/test';

test.describe('Webhook Gateway Security E2E', () => {
  test('Stripe webhook rejects requests missing stripe-signature header', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', {
      data: JSON.stringify({ id: 'evt_test_fake', type: 'invoice.payment_succeeded' }),
      headers: {
        'content-type': 'application/json'
      }
    });
    // Must reject with 400 (missing signature) or 500 (unconfigured secret)
    expect([400, 500]).toContain(res.status());
  });

  test('Razorpay webhook rejects requests missing x-razorpay-signature header', async ({ request }) => {
    const res = await request.post('/api/webhooks/razorpay', {
      data: JSON.stringify({ event: 'order.paid' }),
      headers: {
        'content-type': 'application/json'
      }
    });
    // Must reject with 400 (missing signature) or 500 (unconfigured secret)
    expect([400, 500]).toContain(res.status());
  });
});
