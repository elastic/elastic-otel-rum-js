import { test, expect } from '@playwright/test';
import { mockServerFor } from '../page-utils';

test('should export spans when page is loaded', async ({ page }) => {
    const collector = mockServerFor(page);
    await page.goto('/document-load/use-document-load.html');

    const spans = await collector.getSpans();
    expect(spans.length).toBeGreaterThan(0);
});


test('should export document load related span with timing events', async ({ page }) => {
    const collector = mockServerFor(page);
    await page.goto('/document-load/use-document-load.html');

    const spans = await collector.getSpans();
    expect(spans.length).toBeGreaterThan(0);

    const spanNames = ['documentFetch', 'resourceFetch', 'documentLoad'];

    for (const name of spanNames) {
        const span = spans.find(s => s.name === name);
        expect(span).toBeDefined();
        expect(span.events).toBeDefined();
        expect(span.events.length).toBeGreaterThan(0);
        // TODO: inspect events payload?
    }
});
