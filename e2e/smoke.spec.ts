import { expect, test, type Page } from '@playwright/test';

import { statePath } from './accounts';

const ADMIN_PAGES = [
  '/dashboard',
  '/',
  '/asset-requests',
  '/returns',
  '/maintenance',
  '/tickets',
  '/users',
  '/reports',
  '/activity-logs',
  '/notifications',
];
const EMPLOYEE_PAGES = ['/my-assets', '/my-requests', '/my-returns', '/support', '/notifications'];

/** Page errors and console errors (failed API calls log one too). */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function expectPageWorks(page: Page, path: string) {
  const errors = collectErrors(page);
  await page.goto(path);
  await expect(page).toHaveURL((url) => url.pathname === path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0); // no load-error banner
  // Phone width: the page itself must not scroll sideways (tables scroll inside their card).
  await page.setViewportSize({ width: 360, height: 800 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
}

test.describe('signed out', () => {
  test('protected pages send you to the login page', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/login\?next=%2Fusers$/);
    await expect(page.getByLabel('Work email')).toBeVisible();
  });
});

test.describe('admin', () => {
  test.use({ storageState: statePath('admin') });

  for (const path of ADMIN_PAGES) {
    test(`${path} loads`, async ({ page }) => expectPageWorks(page, path));
  }

  test('employee pages redirect to the dashboard', async ({ page }) => {
    await page.goto('/my-assets');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe('employee', () => {
  test.use({ storageState: statePath('employee') });

  for (const path of EMPLOYEE_PAGES) {
    test(`${path} loads`, async ({ page }) => expectPageWorks(page, path));
  }

  test('admin pages redirect to my assets', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/my-assets$/);
  });
});
