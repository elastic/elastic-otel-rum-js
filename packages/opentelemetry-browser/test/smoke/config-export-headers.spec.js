/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should add the configured heades in export requests', async ({page}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({
            exportHeaders: {foo: 'bar'},
        })
    );
    await page.goto(`/fixtures/use-document-load.html?config=${config}`);

    await collector.getSpans();
    const requests = collector.getRequests();

    expect(requests.length).toBeGreaterThan(0);
    for (const req of requests) {
        expect(req.headers['foo']).toStrictEqual('bar');
    }

    // TODO: make the fixture send metrics and logs???
});
