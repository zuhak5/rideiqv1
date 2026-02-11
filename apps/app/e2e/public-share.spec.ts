import { test, expect } from '@playwright/test';

const live = process.env.E2E_LIVE === 'true' || process.env.E2E_LIVE === '1';
const shareToken = process.env.E2E_SHARE_TOKEN;

test.describe('public share', () => {
  test.skip(!live, 'E2E_LIVE is disabled.');
  test.skip(!shareToken, 'E2E_SHARE_TOKEN is not configured.');

  test('public share page renders', async ({ page }) => {
    await page.goto(`/share/${shareToken}`);
    await expect(page.getByText('Trip share')).toBeVisible();
  });
});

