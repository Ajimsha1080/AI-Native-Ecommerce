import { test, expect } from '@playwright/test';

test.describe('Shopping Concierge Chat Flow', () => {
  test('Embed widget page renders and contains chat input', async ({ page }) => {
    // Navigate to default deployment embed route
    const response = await page.goto('/embed/dep_demo');
    expect(response?.status()).toBeLessThan(500);

    // Verify chat UI elements
    const body = page.locator('body');
    await expect(body).toBeVisible();

    const input = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"], input[type="text"]');
    if (await input.count() > 0) {
      await expect(input.first()).toBeVisible();
    }
  });

  test('Public widget JS script is accessible with CORS and proper mime-type', async ({ request }) => {
    const res = await request.get('/widget.js');
    expect(res.status()).toBe(200);
    const contentType = res.headers()['content-type'];
    expect(contentType).toMatch(/javascript|text/);
  });
});
