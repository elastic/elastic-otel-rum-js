/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should export resource timing related logs', async ({page}) => {
    const collector = createCollector(page);
    await page.goto('/fixtures/use-fetch.html');

    // Check resource logs at load time
    let logs = await collector.getLogs();
    let resourceLogs = logs.filter(
        (l) =>
            l.scope.name ===
            '@opentelemetry/browser-instrumentation/resource-timing'
    );
    expect(logs.length).toBeGreaterThan(0);
    expect(resourceLogs.length).toBeGreaterThan(0);

    // Should report the EDOT script
    const edotTiming = resourceLogs.find((l) =>
        l.attributes['url.full'].endsWith('elastic-otel-browser.min.js')
    );
    expect(edotTiming).toBeDefined();
});

test('should export resource timing related to fetch requests', async ({
    page,
}) => {
    const collector = createCollector(page);
    page.route('api/method', (route, req) => {
        route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'Response for the same origin request',
        });
    });
    await page.goto('/fixtures/use-fetch.html');

    // Get the 1st batch fo logs from the navigation
    let logs = await collector.getLogs();
    expect(logs.length).toBeGreaterThan(0);

    // Now do the fetch and check
    await page.click('#same-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );
    // Get the fetch span & logs
    const spans = await collector.getSpans({flush: false});
    logs = await collector.getLogs();
    expect(spans.length).toEqual(1);

    // Now check we have a resource log for the fetch span
    const spanId = spans[0].spanId;
    const spanUrl = spans[0].attributes['url.full'];
    const fetchLog = logs.find(
        (l) => l.spanId === spanId && l.attributes['url.full'] === spanUrl
    );

    expect(fetchLog).toBeDefined();
});

test('should export resource timing related to XHR requests', async ({
    page,
}) => {
    const collector = createCollector(page);
    page.route('api/method', (route, req) => {
        route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'Response for the same origin request',
        });
    });
    await page.goto('/fixtures/use-xhr.html');

    // Get the 1st batch fo logs from the navigation
    let logs = await collector.getLogs();
    expect(logs.length).toBeGreaterThan(0);

    // Now do the fetch and check
    await page.click('#same-origin');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'finished'
    );
    // Get the XHR span & logs
    const spans = await collector.getSpans({flush: false});
    logs = await collector.getLogs();
    expect(spans.length).toEqual(1);

    // Now check we have a resource log for the XHR span
    const spanId = spans[0].spanId;
    const spanUrl = spans[0].attributes['url.full'];
    const xhrLog = logs.find(
        (l) => l.spanId === spanId && l.attributes['url.full'] === spanUrl
    );

    expect(xhrLog).toBeDefined();
});
