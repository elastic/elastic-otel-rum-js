/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should export navigation related logs with timing attributes', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.goto('/fixtures/use-navigation-timing.html');

    const logs = await collector.getLogs();
    const navigationLogs = logs.filter(
        (l) =>
            l.scope.name ===
            '@opentelemetry/browser-instrumentation/navigation-timing'
    );
    expect(logs.length).toBeGreaterThan(0);
    expect(navigationLogs.length).toBeGreaterThan(0);

    expect(navigationLogs[0].eventName).toEqual('browser.navigation_timing');
    expect(navigationLogs[0].attributes['url.full']).toBeDefined();
    expect(
        navigationLogs[0].attributes['browser.resource_timing.fetch_start']
    ).toBeDefined();
    expect(
        navigationLogs[0].attributes['browser.navigation_timing.dom_complete']
    ).toBeDefined();
});
