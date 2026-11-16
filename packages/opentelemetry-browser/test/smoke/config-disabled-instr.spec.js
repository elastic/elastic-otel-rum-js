/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should not enable an instrumentation if set to disabled via disableInstrumentations', async ({
    page,
}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({
            disableInstrumentations: ['resource-timing'],
        })
    );
    await page.goto(`/fixtures/use-navigation-timing.html?config=${config}`);

    const logs = await collector.getLogs();
    expect(logs.length).toBeGreaterThan(0);

    const timingLogs = logs.filter(
        (l) =>
            l.scope.name ===
            '@opentelemetry/browser-instrumentation/resource-timing'
    );
    expect(timingLogs.length).toBe(0);
});

// NOTE: this test will be gone in a follow up update of `@opentelemetry/browser-instrumentation`
// where the `enabled` config option does not exist anymore
test('should give precedence to disableInstrumentations over enabled instrumentation config option', async ({
    page,
}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({
            disableInstrumentations: ['resource-timing'],
            instrumentations: {
                'resource-timing': {enabled: true},
            },
        })
    );
    await page.goto(`/fixtures/use-navigation-timing.html?config=${config}`);

    const logs = await collector.getLogs();
    expect(logs.length).toBeGreaterThan(0);

    const timingLogs = logs.filter(
        (l) =>
            l.scope.name ===
            '@opentelemetry/browser-instrumentation/resource-timing'
    );
    expect(timingLogs.length).toBe(0);
});
