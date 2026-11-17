/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

const FIXTURE = '/fixtures/use-navigation-timing.html';

/**
 * @param {import('./test-utils').Collector} collector
 * @param {string} eventName
 */
async function waitForEvent(collector, eventName) {
    /** @type {import('./test-utils').CollectedLog | undefined} */
    let found;
    await expect
        .poll(async () => {
            found = (await collector.getLogs()).find(
                (l) => l.eventName === eventName
            );
            return found;
        })
        .toBeDefined();
    return found;
}

test('should export addAction as a log event with session, user and page context', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.goto(FIXTURE);

    await page.evaluate(() => {
        globalThis.edotBrowser.setUser({id: 'u-1'});
        globalThis.edotBrowser.addAction('product.search', {
            'search.query': 'shoes',
            'search.result_count': 12,
            'session.id': 'spoofed',
        });
    });

    const action = await waitForEvent(collector, 'action.product.search');
    const attrs = action?.attributes ?? {};
    expect(attrs['search.query']).toStrictEqual('shoes');
    expect(attrs['search.result_count']).toStrictEqual(12);
    expect(attrs['url.full']).toContain(FIXTURE);
    expect(attrs['user.id']).toStrictEqual('u-1');
    expect(attrs['session.id']).toBeDefined();
    expect(attrs['session.id']).not.toStrictEqual('spoofed');
});
