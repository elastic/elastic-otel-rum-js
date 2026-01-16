import { test, expect } from '@playwright/test';
import { createCollector } from './test-utils';

test('should send export requests to the configured endpoint', async ({ page }) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(JSON.stringify({otlpEndpoint: 'http://collector:4318/'}));
    await page.goto(`/fixtures/use-document-load.html?config=${config}`);

    const spans = await collector.getSpans();
    expect(spans.length).toBeGreaterThan(0);

    const requests = collector.getRequests();
    expect(requests.length).toBeGreaterThan(0);
    for(const req of requests) {
        const url = new URL(req.url);
        expect(url.hostname).toStrictEqual('collector');
        expect(url.port).toStrictEqual('4318');
    }

    // TODO: make the fixture send metrics and logs???
});
