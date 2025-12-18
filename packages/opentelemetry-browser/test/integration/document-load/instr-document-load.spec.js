import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/document-load/use-document-load.html');

  const content = await page.content();

  console.log(content);

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});
