/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

const FIXTURE = '/fixtures/use-navigation-timing.html';

/**
 * Clicks the page and returns the attributes of the resulting click log.
 * @param {import('@playwright/test').Page} page
 * @param {import('./test-utils').Collector} collector
 */
async function clickAndGetAttributes(page, collector) {
    collector.clear();
    await page.click('h1');
    /** @type {import('./test-utils').CollectedLog | undefined} */
    let click;
    await expect
        .poll(async () => {
            click = (await collector.getLogs()).find(
                (l) => l.eventName === 'browser.user_action.click'
            );
            return click;
        })
        .toBeDefined();
    return click?.attributes ?? {};
}

test('should add user attributes to telemetry after setUser until clearUser', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.goto(FIXTURE);

    const anonymous = await clickAndGetAttributes(page, collector);
    expect(anonymous['user.id']).toBeUndefined();

    await page.evaluate(() =>
        globalThis.edotBrowser.setUser({
            id: 'u-1',
            email: 'ada@example.com',
            name: 'Ada Lovelace',
            account: 'acme',
            attributes: {plan: 'premium'},
        })
    );
    const identified = await clickAndGetAttributes(page, collector);
    expect(identified['user.id']).toStrictEqual('u-1');
    expect(identified['user.email']).toStrictEqual('ada@example.com');
    expect(identified['user.full_name']).toStrictEqual('Ada Lovelace');
    expect(identified['elastic.user.account']).toStrictEqual('acme');
    expect(identified['elastic.user.attributes.plan']).toStrictEqual('premium');

    await page.evaluate(() => globalThis.edotBrowser.clearUser());
    const cleared = await clickAndGetAttributes(page, collector);
    expect(cleared['user.id']).toBeUndefined();
    expect(cleared['user.email']).toBeUndefined();
    expect(cleared['elastic.user.attributes.plan']).toBeUndefined();
});

test('should set the user from the handle of a second startBrowserSdk call', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.goto(FIXTURE);

    await page.evaluate(() =>
        globalThis.startBrowserSdk({}).setUser({id: 'u-2'})
    );
    const identified = await clickAndGetAttributes(page, collector);
    expect(identified['user.id']).toStrictEqual('u-2');
});
