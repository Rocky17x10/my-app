import { expect, test as setup } from '@playwright/test';

import { account, statePath, type TestRole } from './accounts';

for (const role of ['admin', 'employee'] as const satisfies TestRole[]) {
  setup(`sign in as ${role}`, async ({ page }) => {
    const { email, password, home } = account(role);
    await page.goto('/login');
    await page.getByLabel('Work email').fill(email);
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(`**${home}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.context().storageState({ path: statePath(role) });
  });
}
