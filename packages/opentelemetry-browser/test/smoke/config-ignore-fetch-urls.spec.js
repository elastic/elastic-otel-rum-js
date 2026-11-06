/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector, addRoutes} from './test-utils';

test('should ignore export URLs by default', async ({page}) => {
    const collector = createCollector(page);

    await page.goto('/fixtures/use-fetch.html');
    await addRoutes(page);
    await page.click('#same-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );

    // We got the 1st batch of spans and logs
    let spans = await collector.getSpans({flush: false});
    const logs = await collector.getLogs();
    expect(spans.length).toBeGreaterThan(0);
    expect(logs.length).toBeGreaterThan(0);

    // After this export the resource timings of the fetch call to /v1/traces and
    // v1/logs are going to be reported to the instrumentation. But they should
    // be ignored

    // We click a button to make sure is thre is a next batch of spans/logs
    // so we do not wait the collector to fail. Next batch will include the export
    // Spans if the default ignores don't work
    await page.click('#same-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );

    spans = await collector.getSpans({flush: false});
    expect(
        spans.find((s) => {
            /** @type {string} */
            const urlFull = s.attributes['url.full'];
            return urlFull.includes('v1/traces') || urlFull.includes('v1/logs');
        })
    ).not.toBeDefined();
});

test('should collect telemetry if no URL is ignored', async ({page}) => {
    const collector = createCollector(page);

    await page.goto('/fixtures/use-fetch.html');
    await addRoutes(page);
    await page.click('#same-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );

    const spans = await collector.getSpans({flush: false});
    const fetchSpans = spans.filter(
        (s) => s.scope.name === '@opentelemetry/browser-instrumentation/fetch'
    );

    // We got the fetch span
    expect(spans.length).toBeGreaterThan(0);
    expect(fetchSpans.length).toStrictEqual(1);

    const span = fetchSpans[0];
    const logs = await collector.getLogs();
    const fetchLog = logs
        .filter(
            (l) =>
                l.scope.name ===
                '@opentelemetry/browser-instrumentation/resource-timing'
        )
        .find((l) => l.attributes['url.full'] === span.attributes['url.full']);

    // We got resource timing logs
    expect(fetchLog).toBeDefined();
});

test('should not collect telemetry if the URL is ignored using "ignoreFetchUrls"', async ({
    page,
}) => {
    const collector = createCollector(page);

    const exampleUrl = 'http://www.example.com/';
    const apiUrl = 'http://localhost:3000/api/method';
    const config = encodeURIComponent(
        JSON.stringify({
            ignoreFetchUrls: [apiUrl],
        })
    );
    await page.goto(`/fixtures/use-fetch.html?config=${config}`);
    await addRoutes(page);
    await page.click('#same-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );
    await page.click('#other-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );

    // We should get only spans for the other origin request and not for the API request
    const spans = await collector.getSpans({flush: false});

    const apiSpans = spans.filter((s) => s.attributes['url.full'] === apiUrl);
    expect(apiSpans.length).toEqual(0);

    const exampleSpans = spans.filter(
        (s) => s.attributes['url.full'] === exampleUrl
    );
    expect(exampleSpans.length).toBeGreaterThan(0);

    // Same for logs
    const logs = await collector.getLogs();

    const apiLogs = logs.filter((l) => l.attributes['url.full'] === apiUrl);
    expect(apiLogs.length).toEqual(0);

    const exampleLogs = spans.filter(
        (l) => l.attributes['url.full'] === exampleUrl
    );
    expect(exampleLogs.length).toBeGreaterThan(0);
});

test('should combine the "ignoreUrls" option from instrumentation and "ignoreFetchUrls"', async ({
    page,
}) => {
    const collector = createCollector(page);

    const apiUrl = 'http://localhost:3000/api/method';
    const exampleUrl = 'http://www.example.com/';
    const foobarUrl = 'http://www.foobar.com/';
    const config = encodeURIComponent(
        JSON.stringify({
            ignoreFetchUrls: [apiUrl],
            instrumentations: {
                fetch: {ignoreUrls: [exampleUrl]},
            },
        })
    );
    await page.goto(`/fixtures/use-fetch.html?config=${config}`);
    await addRoutes(page);
    await page.click('#same-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );
    await page.click('#other-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );
    await page.click('#another-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );

    // We should get only spans for the last click request
    const spans = await collector.getSpans({flush: false});

    const apiSpans = spans.filter((s) => s.attributes['url.full'] === apiUrl);
    expect(apiSpans.length).toEqual(0);

    const exampleSpans = spans.filter(
        (s) => s.attributes['url.full'] === exampleUrl
    );
    expect(exampleSpans.length).toEqual(0);

    const foobarSpans = spans.filter(
        (s) => s.attributes['url.full'] === foobarUrl
    );
    expect(foobarSpans.length).toBeGreaterThan(0);

    // For logs only the global ignore works because the other ignored
    // URL is scoped to fetch instrumentation and not resource-timing
    const logs = await collector.getLogs();

    const apiLogs = logs.filter((l) => l.attributes['url.full'] === apiUrl);
    expect(apiLogs.length).toEqual(0);

    const exampleLogs = logs.filter(
        (l) => l.attributes['url.full'] === exampleUrl
    );
    expect(exampleLogs.length).toBeGreaterThan(0);

    const foobarLogs = logs.filter(
        (l) => l.attributes['url.full'] === foobarUrl
    );
    expect(foobarLogs.length).toBeGreaterThan(0);
});
