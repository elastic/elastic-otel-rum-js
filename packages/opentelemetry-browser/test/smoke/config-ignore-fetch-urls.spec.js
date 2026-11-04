/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should collect telemetry if no URL is ignored', async ({page}) => {
    const collector = createCollector(page);
    page.route('api/method', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'Response for the same origin request',
        });
    });

    await page.goto('/fixtures/use-fetch.html');
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

    // We got reource timing logs
    expect(fetchLog).toBeDefined();
});

test('should not collect telemetry if the URL is ignored using "ignoreFetchUrls"', async ({
    page,
}) => {
    const collector = createCollector(page);
    page.route('api/method', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'Response for the same origin request',
        });
    });

    const apiUrl = 'http://localhost:3000/api/method';
    const config = encodeURIComponent(
        JSON.stringify({
            ignoreFetchUrls: [apiUrl],
        })
    );
    await page.goto(`/fixtures/use-fetch.html?config=${config}`);
    await page.click('#same-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );

    // We should get no spans since only fetch instrumetation exports
    try {
        const spans = await collector.getSpans({flush: false});
        // fail on purpose
        expect(spans).toBeUndefined();
    } catch (err) {
        // that is expected
        expect(err).toBeDefined();
    }

    // We get logs but none related to the fetch request
    const logs = await collector.getLogs();
    const fetchLogs = logs.filter((l) => l.attributes['url.full'] === apiUrl);
    expect(fetchLogs.length).toEqual(0);
});

test('should combine the "ignoreUrls" option from intrumentation and "ignoreFetchUrls"', async ({
    page,
}) => {
    const collector = createCollector(page);
    page.route('api/method', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'Response for the same origin request',
        });
    });
    page.route('http://www.example.com', (route, req) => {
        route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'Response for a different origin request',
        });
    });

    const apiUrl = 'http://localhost:3000/api/method';
    const extUrl = 'http://www.example.com/';
    const config = encodeURIComponent(
        JSON.stringify({
            ignoreFetchUrls: [apiUrl],
            instrumentations: {
                fetch: {ignoreUrls: [extUrl]},
            },
        })
    );
    await page.goto(`/fixtures/use-fetch.html?config=${config}`);
    await page.click('#same-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );
    await page.click('#other-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );

    // We should get no spans because of the ignore URLs combined
    try {
        const spans = await collector.getSpans({flush: false});
        // fail on purpose
        expect(spans).toBeUndefined();
    } catch (err) {
        // that is expected
        expect(err).toBeDefined();
    }

    // We get logs (resource-timing) but only from the external URL request (not in the global config)
    const logs = await collector.getLogs();
    const extFetchLogs = logs.filter(
        (l) =>
            l.eventName === 'browser.resource_timing' &&
            l.attributes['url.full'] === extUrl
    );
    expect(extFetchLogs.length).toBeGreaterThan(0);
});
