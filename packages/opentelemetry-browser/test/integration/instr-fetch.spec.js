import { test, expect } from '@playwright/test';
import { createCollector } from './test-utils';

test('should export fetch related spans', async ({ page }) => {
    const collector = createCollector(page);
    const sameOriginHeaders = {};
    const otherOriginHeaders = {};
    page.route('api/method', (route, req) => {
        Object.assign(sameOriginHeaders, req.headers());
        route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'Response for the same origin request'
        });
    });
    page.route('http://www.example.com', (route, req) => {
        Object.assign(otherOriginHeaders, req.headers());
        route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'Response for the same origin request'
        });
    });

    await page.goto('/fixtures/use-fetch.html');
    await page.click('#same-origin');
    await page.click('#other-origin');

    const spans = await collector.getSpans();
    const fetchSpans = spans.filter(s => s.scope.name === '@opentelemetry/instrumentation-fetch');

    // We got spans
    expect(spans.length).toBeGreaterThan(0);
    expect(fetchSpans.length).toStrictEqual(2);

    // A span for each fetch request
    expect(fetchSpans[0].kind).toStrictEqual('SPAN_KIND_CLIENT');
    expect(fetchSpans[0].attributes['http.url']).toStrictEqual('http://localhost:3000/api/method');
    expect(fetchSpans[1].kind).toStrictEqual('SPAN_KIND_CLIENT');
    expect(fetchSpans[1].attributes['http.url']).toStrictEqual('http://www.example.com/');

    // Tracestate is propagated in same origin without removing curret headers
    expect(sameOriginHeaders['traceparent']).toBeDefined();
    expect(sameOriginHeaders['foo']).toStrictEqual('bar');
    // but not in requests to other origins
    expect(otherOriginHeaders['traceparent']).not.toBeDefined();
    expect(otherOriginHeaders['bar']).toStrictEqual('baz');
});
