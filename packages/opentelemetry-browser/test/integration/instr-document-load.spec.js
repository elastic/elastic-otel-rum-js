import { test, expect } from '@playwright/test';
import { mockServerFor } from './test-utils';

test('should export document load related spans with timing events', async ({ page }) => {
    const collector = mockServerFor(page);
    await page.goto('/fixtures/use-document-load.html');

    const content = await page.content();
    const traceparent = content.match(/<meta\s+name="traceparent"\s+content="([^"]+)"/)[1];
    const traceId = traceparent.split('-')[1];

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
        if (name === 'documentLoad') {
            expect(span.traceId).toStrictEqual(traceId);
        }

        // TODO: inspect events payload?
    }
});
