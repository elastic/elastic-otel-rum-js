/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should add the path separator when the endpoint has no trailing slash', async ({
    page,
}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({
            exportConfig: {url: 'http://collector:4318/otlp'},
        })
    );
    await page.goto(`/fixtures/use-navigation-timing.html?config=${config}`);

    const logs = await collector.getLogs();
    expect(logs.length).toBeGreaterThan(0);

    const requests = collector.getRequests();
    expect(requests.length).toBeGreaterThan(0);
    for (const req of requests) {
        expect(new URL(req.url).pathname).toMatch(
            /^\/otlp\/v1\/(traces|logs|metrics)$/
        );
    }
});

test('should send export requests to the configured endpoint', async ({
    page,
}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({
            exportConfig: {url: 'http://collector:4318/'},
        })
    );
    await page.goto(`/fixtures/use-navigation-timing.html?config=${config}`);

    const logs = await collector.getLogs();
    expect(logs.length).toBeGreaterThan(0);

    const requests = collector.getRequests();
    expect(requests.length).toBeGreaterThan(0);
    for (const req of requests) {
        const url = new URL(req.url);
        expect(url.hostname).toStrictEqual('collector');
        expect(url.port).toStrictEqual('4318');
    }
});

test('should send each signal to its own configured URL', async ({page}) => {
    /** @type {string[]} */
    const received = [];
    await page.route('http://collector:4318/custom/**', async (route, req) => {
        received.push(new URL(req.url()).pathname);
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: '',
        });
    });
    const config = encodeURIComponent(
        JSON.stringify({
            exportConfig: {
                tracesUrl: 'http://collector:4318/custom/t',
                logsUrl: 'http://collector:4318/custom/l',
            },
        })
    );
    await page.goto(`/fixtures/use-navigation-timing.html?config=${config}`);

    // navigation timing is exported as logs; the exact path is used, no /v1/logs appended
    await expect.poll(() => received).toContain('/custom/l');
    expect(received.some((p) => p.includes('/v1/'))).toBe(false);
});
