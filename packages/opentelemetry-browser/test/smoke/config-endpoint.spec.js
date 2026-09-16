/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

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
