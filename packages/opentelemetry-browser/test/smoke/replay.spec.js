/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils.js';

test('replay.enabled emits elastic-rrweb logs with required attributes', async ({
    page,
}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({
            serviceName: 'replay-smoke',
            otlpEndpoint: 'http://localhost:3000',
            replay: {
                enabled: true,
                samplingRate: 100,
                errorSamplingRate: 100,
            },
        })
    );
    await page.goto(`/fixtures/use-replay.html?config=${config}&sync=true`);
    await page.click('#action');
    // Allow async startReplay (dynamic import / record init) to finish
    await page.waitForTimeout(1000);

    const logs = await collector.getLogs({flush: true});
    const replayLogs = logs.filter((l) => l.scope?.name === 'elastic-rrweb');
    expect(replayLogs.length).toBeGreaterThan(0);

    const sample = replayLogs.find((l) => l.attributes?.['session.id']);
    expect(sample).toBeTruthy();
    expect(sample.attributes['session.id']).toBeTruthy();
    expect(
        sample.attributes['rr-web.event'] === 0 ||
            sample.attributes['rr-web.event'] > 0
    ).toBeTruthy();
    expect(sample.attributes['rrweb.type']).toBeDefined();
    expect(sample.attributes['elastic.rum.log.type']).toBe('replay');
});
