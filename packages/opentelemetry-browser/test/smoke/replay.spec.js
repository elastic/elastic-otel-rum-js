/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

const FIXTURE = '/fixtures/use-replay.html';
const REPLAY_SCOPE = '@elastic/opentelemetry-browser/replay';

/**
 * @param {Record<string, any>} config
 * @param {string} [bundle]
 */
function fixtureUrl(config, bundle = 'replay') {
    const cfg = encodeURIComponent(JSON.stringify(config));
    return `${FIXTURE}?config=${cfg}&bundle=${bundle}`;
}

/**
 * @param {import('./test-utils').CollectedLog} log
 * @returns {string}
 */
function bodyOf(log) {
    return log.body?.stringValue ?? '';
}

/**
 * @param {import('./test-utils').CollectedLog[]} logs
 */
function replayLogs(logs) {
    return logs.filter((l) => l.scope.name === REPLAY_SCOPE);
}

test('should export replay records with session attributes when enabled', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.goto(fixtureUrl({replay: {enabled: true}}));
    await page.fill('#secret', 'hunter2');
    await page.click('#action');

    /** @type {import('./test-utils').CollectedLog[]} */
    let logs = [];
    // Wait for the input event (IncrementalSnapshot with source Input)
    await expect
        .poll(async () => {
            logs = await collector.getLogs();
            return replayLogs(logs).some((l) => {
                const event = JSON.parse(bodyOf(l) || '{}');
                return event.type === 3 && event.data?.source === 5;
            });
        })
        .toBe(true);

    const sessionStart = logs.find((l) => l.eventName === 'session.start');
    const sessionId = sessionStart?.attributes['session.id'];
    const records = replayLogs(logs);
    const starts = records.filter(
        (l) => l.eventName === 'elastic.replay.start'
    );
    const events = records
        .filter((l) => l.eventName === 'elastic.replay.event')
        .sort(
            (a, b) =>
                a.attributes['elastic.replay.sequence'] -
                b.attributes['elastic.replay.sequence']
        );

    expect(starts.length).toStrictEqual(1);
    expect(starts[0].attributes['elastic.replay.trigger']).toStrictEqual(
        'sampled'
    );
    expect(starts[0].attributes['elastic.replay.format']).toStrictEqual(
        'rrweb/2'
    );
    const segmentId = starts[0].attributes['elastic.replay.segment.id'];
    expect(segmentId).toMatch(/^[0-9a-f-]{36}$/);

    for (const r of records) {
        expect(r.attributes['session.id']).toStrictEqual(sessionId);
        expect(r.attributes['browser.tab.id']).toMatch(/^[0-9a-f-]{36}$/);
        expect(r.attributes['elastic.replay.segment.id']).toStrictEqual(
            segmentId
        );
    }

    // Contiguous sequence starting with Meta and FullSnapshot
    expect(events.map((e) => e.attributes['elastic.replay.sequence'])).toEqual(
        events.map((_, i) => i)
    );
    expect(events[0].attributes['elastic.replay.event.type']).toStrictEqual(4);
    expect(events[1].attributes['elastic.replay.event.type']).toStrictEqual(2);
    for (const e of events) {
        const body = JSON.parse(bodyOf(e));
        expect(body.type).toStrictEqual(
            e.attributes['elastic.replay.event.type']
        );
    }

    // Privacy defaults: all text and inputs masked, blocked content dropped
    const bodies = events.map(bodyOf).join('\n');
    expect(bodies).toContain('*******');
    expect(bodies).not.toContain('Session Replay Test');
    expect(bodies).not.toContain('hunter2');
    expect(bodies).not.toContain('masked-text');
    expect(bodies).not.toContain('blocked-text');
});

test('should record text when maskAllText is false, except opted out markup', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.goto(
        fixtureUrl({replay: {enabled: true, privacy: {maskAllText: false}}})
    );

    /** @type {string} */
    let bodies = '';
    // Wait for the FullSnapshot
    await expect
        .poll(async () => {
            const logs = replayLogs(await collector.getLogs());
            bodies = logs.map(bodyOf).join('\n');
            return logs.some(
                (l) => l.attributes['elastic.replay.event.type'] === 2
            );
        })
        .toBe(true);

    expect(bodies).toContain('Session Replay Test');
    expect(bodies).not.toContain('masked-text');
    expect(bodies).not.toContain('blocked-text');
});

test('should not export replay records when disabled', async ({page}) => {
    const collector = createCollector(page);
    await page.goto(fixtureUrl({replay: {enabled: false}}));
    await page.click('#action');

    const logs = await collector.getLogs();
    expect(logs.some((l) => l.eventName === 'session.start')).toBe(true);
    expect(replayLogs(logs)).toEqual([]);
});

test('should warn and not record with the core bundle', async ({page}) => {
    /** @type {string[]} */
    const messages = [];
    page.on('console', (msg) => messages.push(msg.text()));
    const collector = createCollector(page);
    await page.goto(fixtureUrl({replay: {enabled: true}}, 'core'));
    await page.click('#action');

    const logs = await collector.getLogs();
    expect(logs.some((l) => l.eventName === 'session.start')).toBe(true);
    expect(replayLogs(logs)).toEqual([]);
    expect(
        messages.some((m) =>
            m.includes('@elastic/opentelemetry-browser/replay')
        )
    ).toBe(true);
});
