import { test, expect } from '@playwright/test';
import { createCollector } from './test-utils';

test('should export long task related spans', async ({ page }) => {
    const collector = createCollector(page);
    await page.goto('/fixtures/use-long-task.html');

    await page.click('#long-task');

    const spans = await collector.getSpans();
    expect(spans.length).toBeGreaterThan(0);

    const longTaskSpan = spans.find(s => s.scope.name === '@opentelemetry/instrumentation-long-task');
    expect(longTaskSpan).toBeDefined();
});
