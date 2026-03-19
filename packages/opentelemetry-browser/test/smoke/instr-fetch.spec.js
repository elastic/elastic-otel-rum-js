/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should export fetch related spans', async ({page}) => {
    // Disable `@opentelemetry/instrumentation-document-load` instrumentation to avoid a 1st export that
    // creates a span due to https://github.com/open-telemetry/opentelemetry-js/issues/6339
    // and gives us wrong data
    const config = encodeURIComponent(
        JSON.stringify({
            instrumentations: {
                '@opentelemetry/instrumentation-document-load': {
                    enabled: false,
                },
            },
        })
    );

    const collector = createCollector(page);
    const sameOriginHeaders = {};
    const otherOriginHeaders = {};
    page.route('api/method', (route, req) => {
        Object.assign(sameOriginHeaders, req.headers());
        route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'Response for the same origin request',
        });
    });
    page.route('http://www.example.com', (route, req) => {
        Object.assign(otherOriginHeaders, req.headers());
        route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'Response for the same origin request',
        });
    });

    await page.goto(`/fixtures/use-fetch.html?config=${config}`);
    await page.click('#same-origin');
    await page.waitForFunction(
        () => document.getElementById('status').innerText === 'finished'
    );
    await page.click('#other-origin');
    await page.waitForFunction(
        () => document.getElementById('status').innerText === 'finished'
    );

    const spans = await collector.getSpans({flush: false});
    const fetchSpans = spans.filter(
        (s) => s.scope.name === '@opentelemetry/instrumentation-fetch'
    );

    // We got spans
    expect(spans.length).toBeGreaterThan(0);
    expect(fetchSpans.length).toStrictEqual(2);

    // A span for each fetch request, using stable semvconv
    expect(fetchSpans[0].kind).toStrictEqual('SPAN_KIND_CLIENT');
    expect(fetchSpans[0].attributes['http.url']).not.toBeDefined();
    expect(fetchSpans[0].attributes['url.full']).toStrictEqual(
        'http://localhost:3000/api/method'
    );
    expect(fetchSpans[1].kind).toStrictEqual('SPAN_KIND_CLIENT');
    expect(fetchSpans[1].attributes['http.url']).not.toBeDefined();
    expect(fetchSpans[1].attributes['url.full']).toStrictEqual(
        'http://www.example.com/'
    );

    // Tracestate is propagated in same origin without removing curret headers
    expect(sameOriginHeaders['traceparent']).toBeDefined();
    expect(sameOriginHeaders['foo']).toStrictEqual('bar');
    // but not in requests to other origins
    expect(otherOriginHeaders['traceparent']).not.toBeDefined();
    expect(otherOriginHeaders['bar']).toStrictEqual('baz');
});
