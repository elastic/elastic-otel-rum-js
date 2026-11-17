/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

const FIXTURE = '/fixtures/use-long-animation-frame.html';
const SCOPE_NAME =
    '@opentelemetry/browser-instrumentation/long-animation-frame';

test('should export long animation frame logs', async ({page}) => {
    const collector = createCollector(page);
    await page.goto(FIXTURE);

    const supported = await page.evaluate(() =>
        PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')
    );
    test.skip(
        !supported,
        'PerformanceObserver does not support long-animation-frame'
    );

    await page.click('#block');
    await page.waitForFunction(
        () => document.getElementById('status')?.innerText === 'done'
    );

    /** @type {any[]} */
    let logs = [];
    await expect
        .poll(async () => {
            logs = await collector.getLogs();
            return logs.filter((l) => l.scope.name === SCOPE_NAME).length;
        })
        .toBeGreaterThan(0);

    const loafLogs = logs.filter((l) => l.scope.name === SCOPE_NAME);
    for (const record of loafLogs) {
        expect(record.eventName).toEqual('browser.long_animation_frame');
        expect(
            record.attributes['browser.long_animation_frame.duration']
        ).toBeGreaterThan(0);
        expect(
            record.attributes['browser.long_animation_frame.start_time']
        ).toBeGreaterThanOrEqual(0);
    }
});
