import { test, expect } from '@playwright/test';

const WEB_URL = process.env.WEB_URL || 'https://hosp-web-two.vercel.app';
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!TEST_EMAIL || !TEST_PASSWORD) {
  throw new Error("TEST_EMAIL and TEST_PASSWORD environment variables are required.");
}

test('frontend smoke: deployed app loads', async ({ page }) => {
  await page.goto(WEB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await expect(page.locator('body')).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  expect(bodyText.length).toBeGreaterThan(0);

  console.log('PAGE TITLE:', await page.title());
  console.log('BODY TEXT:', bodyText.slice(0, 500));
});
test('frontend smoke: sign in page opens', async ({ page }) => {
  await page.goto(WEB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.getByRole('link', { name: 'Sign In', exact: true }).click();

  await expect(page.locator('body')).toContainText(/email|password|sign in|login/i);
});
test('frontend smoke: login works', async ({ page }) => {
  await page.goto(`${WEB_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);

  await page.getByRole('button', { name: /sign in|login/i }).click();

  await expect(page.locator('body')).toContainText(/dashboard|patients|appointments|logout|sign out/i, {
    timeout: 30000,
  });
});
test('frontend smoke: login and dashboard navigation', async ({ page }) => {
  await page.goto(`${WEB_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|login/i }).click();

  await expect(page.locator('body')).toContainText(/dashboard|patients|appointments/i, {
    timeout: 30000,
  });

  await page.getByText(/patients/i).first().click();
  await expect(page.locator('body')).toContainText(/patient/i, { timeout: 30000 });

  await page.getByText(/appointments/i).first().click();
  await expect(page.locator('body')).toContainText(/appointment|doctor/i, { timeout: 30000 });
});
