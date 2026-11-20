/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector, addRoutes} from './test-utils';

test('should export XMLHttpRequest related spans', async ({page}) => {
    const collector = createCollector(page);
    /** @type {Record<string, any>} */
    const sameOriginHeaders = {};
    /** @type {Record<string, any>} */
    const otherOriginHeaders = {};

    await page.goto('/fixtures/use-xhr.html');
    await addRoutes(page, (req) => {
        const headers = req.headers();
        if (req.url().includes('api/method')) {
            Object.assign(sameOriginHeaders, headers);
        } else {
            Object.assign(otherOriginHeaders, headers);
        }
    });
    await page.click('#same-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );
    await page.click('#other-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );

    const spans = await collector.getSpans({flush: false});
    const fetchSpans = spans.filter(
        (s) => s.scope.name === '@opentelemetry/browser-instrumentation/xhr'
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
