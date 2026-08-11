/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils.js';

test('replay.samplingRate:0 and errorSamplingRate:0 emits no elastic-rrweb logs', async ({
    page,
}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({
            serviceName: 'replay-smoke',
            otlpEndpoint: 'http://localhost:3000',
            replay: {
                enabled: true,
                samplingRate: 0,
                errorSamplingRate: 0,
            },
        })
    );
    await page.goto(`/fixtures/use-replay.html?config=${config}&sync=true`);
    await page.click('#action');
    await page.waitForTimeout(500);

    let logs = [];
    try {
        logs = await collector.getLogs({flush: true});
    } catch (_) {
        // no logs at all is fine
    }
    const replayLogs = logs.filter((l) => l.scope?.name === 'elastic-rrweb');
    expect(replayLogs.length).toBe(0);
});

test('replay.enabled:false does not load replay path', async ({page}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({
            serviceName: 'replay-smoke',
            otlpEndpoint: 'http://localhost:3000',
            replay: {enabled: false},
        })
    );
    await page.goto(`/fixtures/use-replay.html?config=${config}&sync=true`);
    await page.click('#action');
    await page.waitForTimeout(300);

    // Traces still work
    const spans = await collector.getSpans({flush: true});
    expect(spans.length).toBeGreaterThan(0);

    const logs = collector.getRequests().filter((r) => r.url.includes('/v1/logs'));
    // May have web-vitals/exception logs; assert no elastic-rrweb scope
    let replayCount = 0;
    for (const req of logs) {
        for (const rl of req.data.resourceLogs || []) {
            for (const sl of rl.scopeLogs || []) {
                if (sl.scope?.name === 'elastic-rrweb') {
                    replayCount += (sl.logRecords || []).length;
                }
            }
        }
    }
    expect(replayCount).toBe(0);
});
