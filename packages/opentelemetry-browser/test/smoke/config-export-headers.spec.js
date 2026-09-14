/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should add the configured headers in export requests', async ({page}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({
            exportConfig: {
                url: 'http://localhost:4318',
                headers: {foo: 'bar'},
            },
        })
    );
    await page.goto(`/fixtures/use-navigation-timing.html?config=${config}`);

    await collector.getLogs();
    const requests = collector.getRequests();

    expect(requests.length).toBeGreaterThan(0);
    for (const req of requests) {
        expect(req.headers['foo']).toStrictEqual('bar');
    }
});
