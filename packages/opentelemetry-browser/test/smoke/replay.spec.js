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
 * @param {boolean} [sync] load the SDK from `<head>`, before the DOM is parsed
 */
function fixtureUrl(config, bundle = 'replay', sync = false) {
    const cfg = encodeURIComponent(JSON.stringify(config));
    return `${FIXTURE}?config=${cfg}&bundle=${bundle}&sync=${sync}`;
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
    await page.goto(fixtureUrl({replay: {enabled: true}}, 'replay', true));
    await page.fill('#secret', 'hunter2');
    await page.check('#consent');
    await page.click('#action');

    /** @type {import('./test-utils').CollectedLog[]} */
    let logs = [];
    // Wait for both input events (IncrementalSnapshot with source Input)
    await expect
        .poll(async () => {
            logs = await collector.getLogs();
            return replayLogs(logs).filter((l) => {
                const event = JSON.parse(bodyOf(l) || '{}');
                return event.type === 3 && event.data?.source === 5;
            }).length;
        })
        .toBeGreaterThanOrEqual(2);

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
    expect(bodies).not.toContain('placeholder-text');
    expect(bodies).not.toContain('hunter2');
    expect(bodies).not.toContain('masked-text');
    expect(bodies).not.toContain('blocked-text');
    // Values rrweb would copy as is
    for (const value of [
        'hidden-value',
        'checkbox-value',
        'submit-label',
        'option-value',
        'option-label',
    ]) {
        expect(bodies).not.toContain(value);
    }
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
    expect(bodies).toContain('placeholder-text');
    expect(bodies).toContain('submit-label');
    expect(bodies).toContain('option-label');
    expect(bodies).not.toContain('masked-text');
    expect(bodies).not.toContain('blocked-text');
    // Input values still follow maskAllInputs
    expect(bodies).not.toContain('hidden-value');
    expect(bodies).not.toContain('checkbox-value');
    expect(bodies).not.toContain('option-value');
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

test('should release recorded DOM nodes on shutdown', async ({page}) => {
    const collector = createCollector(page);
    await page.goto(fixtureUrl({replay: {enabled: true}}));
    await page.evaluate(() => {
        const box = document.createElement('section');
        box.id = 'nodes';
        for (let i = 0; i < 300; i++) {
            box.appendChild(document.createElement('article'));
        }
        document.body.appendChild(box);
    });
    // Wait until the recorder has seen the new nodes
    await expect
        .poll(async () =>
            replayLogs(await collector.getLogs()).some((l) =>
                bodyOf(l).includes('"tagName":"article"')
            )
        )
        .toBe(true);

    await page.evaluate(async () => {
        await globalThis.edotBrowser.shutdown();
        document.getElementById('nodes')?.remove();
    });

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.collectGarbage');
    const {result: proto} = await cdp.send('Runtime.evaluate', {
        expression: 'HTMLElement.prototype',
    });
    const {objects} = await cdp.send('Runtime.queryObjects', {
        prototypeObjectId: String(proto.objectId),
    });
    const {result} = await cdp.send('Runtime.callFunctionOn', {
        objectId: String(objects.objectId),
        // The query also returns prototypes, whose getters throw
        functionDeclaration: `function () {
            return this.filter((el) => {
                try {
                    return el.localName === 'article';
                } catch {
                    return false;
                }
            }).length;
        }`,
        returnByValue: true,
    });
    expect(result.value).toStrictEqual(0);
});
