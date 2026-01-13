import { test, expect } from '@playwright/test';
import { mockServerFor } from './test-utils';

test('should export document load related spans with timing events', async ({ page }) => {
    const collector = mockServerFor(page);
    await page.goto('/fixtures/use-document-load.html');

    const spans = await collector.getSpans();
    
    expect(spans.length).toBeGreaterThan(0);
    for(const span of spans) {
        expect(span.kind).toStrictEqual('SPAN_KIND_INTERNAL')
    }

    const spanNames = ['documentFetch', 'resourceFetch', 'documentLoad'];
    for (const name of spanNames) {
        const span = spans.find(s => s.name === name);
        expect(span).toBeDefined();
        expect(span.events).toBeDefined();
        expect(span.events.length).toBeGreaterThan(0);
        // TODO: inspect events payload?
    }
});
