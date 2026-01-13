import { test, expect } from '@playwright/test';
import { mockServerFor } from '../page-utils';

test('should export spans when page is loaded', async ({ page }) => {
  const collector = mockServerFor(page);
  await page.goto('/document-load/use-document-load.html');

  const spans = await collector.getSpans();
  expect(spans.length).toBeGreaterThan(0);
});
