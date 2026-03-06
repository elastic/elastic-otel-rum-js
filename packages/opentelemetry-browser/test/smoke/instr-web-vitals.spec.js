/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should export web vitals', async ({page, browserName}) => {
    const collector = createCollector(page);
    await page.goto('/fixtures/use-web-vitals.html');
    await page.click('#make-shift');
    // webvitals library won't send the cls unless a visibility change happens, so force one
    await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', {
            value: 'hidden',
            writable: true,
        });
        Object.defineProperty(document, 'hidden', {
            value: true,
            writable: true,
        });
        window.dispatchEvent(new Event('visibilitychange'));
    });

    const logs = await collector.getLogs();
    expect(logs.length).toBeGreaterThan(0);

    // The number of vitals varies from browsers so we test all records
    // have a valid name
    const webVitals = ['ttfb', 'fcp', 'cls', 'lcp'];
    for (const logRecord of logs) {
        const name = logRecord.attributes['browser.web_vital.name'];
        expect(logRecord.eventName).toEqual('browser.web_vital');
        expect(webVitals.includes(name)).toEqual(true);
    }
});
