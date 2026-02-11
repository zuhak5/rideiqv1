import { test, expect } from '@playwright/test';

const live = process.env.E2E_LIVE === 'true' || process.env.E2E_LIVE === '1';
const driverEmail = process.env.E2E_DRIVER_EMAIL;
const driverPassword = process.env.E2E_DRIVER_PASSWORD;

test.describe('driver flow', () => {
  test.skip(!live, 'E2E_LIVE is disabled.');
  test.skip(!driverEmail || !driverPassword, 'Driver credentials are not configured.');

  test('driver can open requests and attempt accept', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(String(driverEmail));
    await page.getByLabel('Password').fill(String(driverPassword));
    await page.getByRole('button', { name: 'Continue with Email' }).click();

    await page.goto('/driver/requests');
    await expect(page.getByText('Incoming requests')).toBeVisible();

    const acceptButton = page.getByRole('button', { name: 'Accept' }).first();
    if (await acceptButton.isVisible()) {
      await acceptButton.click();
      await expect(page.getByText('Request accepted.')).toBeVisible({ timeout: 15000 });
    }
  });
});

