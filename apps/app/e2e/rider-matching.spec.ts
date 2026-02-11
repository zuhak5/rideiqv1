import { test, expect } from '@playwright/test';

const live = process.env.E2E_LIVE === 'true' || process.env.E2E_LIVE === '1';
const riderEmail = process.env.E2E_RIDER_EMAIL;
const riderPassword = process.env.E2E_RIDER_PASSWORD;

test.describe('rider flow', () => {
  test.skip(!live, 'E2E_LIVE is disabled.');
  test.skip(!riderEmail || !riderPassword, 'Rider credentials are not configured.');

  test('rider requests a ride and reaches matching screen', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(String(riderEmail));
    await page.getByLabel('Password').fill(String(riderPassword));
    await page.getByRole('button', { name: 'Continue with Email' }).click();

    await page.goto('/rider/pickup');
    await page.getByLabel('Pickup address').fill('Baghdad');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByLabel('Dropoff address').fill('Karrada');
    await page.getByRole('button', { name: 'Continue to quote' }).click();

    await expect(page.getByText('Fare quote')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Request ride' }).click();
    await expect(page.getByText('Matching')).toBeVisible();
  });
});

