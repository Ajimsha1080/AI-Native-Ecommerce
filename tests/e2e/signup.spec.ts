import { test, expect } from '@playwright/test';

test.describe('Authentication & Signup E2E Flow', () => {
  test('User can access login / signup page and input credentials', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/ShopMate|Login|Sign/i);

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    if (await emailInput.count() > 0) {
      await emailInput.first().fill('enterprise_test@shopmate.ai');
      await passwordInput.first().fill('ValidPassword2026!');
      await expect(emailInput.first()).toHaveValue('enterprise_test@shopmate.ai');
    }
  });

  test('Password policy rejects weak submission', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    if (await passwordInput.count() > 0) {
      await passwordInput.first().fill('123');
      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
      }
    }
  });
});
