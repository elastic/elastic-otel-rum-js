/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should not enable a instrumentation if set to disabled via configuration', async ({
    page,
}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({
            instrumentations: {
                'resource-timing': {enabled: false},
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
