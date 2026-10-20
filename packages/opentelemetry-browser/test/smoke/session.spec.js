/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

const FIXTURE = '/fixtures/use-navigation-timing.html';

/**
 * Waits until all expected click logs are exported since fast-forwarding
 * the clock can split them across export batches.
 * @param {import('./test-utils').Collector} collector
 * @param {number} expected
 */
async function getClickLogs(collector, expected) {
    /** @type {import('./test-utils').CollectedLog[]} */
    let logs = [];
    await expect
        .poll(async () => {
            logs = await collector.getLogs();
            return logs.filter(
                (l) => l.eventName === 'browser.user_action.click'
            ).length;
        })
        .toBe(expected);
    return {
        clicks: logs.filter((l) => l.eventName === 'browser.user_action.click'),
        starts: logs.filter((l) => l.eventName === 'session.start'),
    };
}

test('should add session attributes to logs and emit session.start', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.goto(FIXTURE);

    const logs = await collector.getLogs();
    const sessionId = logs[0].attributes['session.id'];
    const tabId = logs[0].attributes['browser.tab.id'];

    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(tabId).toMatch(/^[0-9a-f-]{36}$/);
    for (const log of logs) {
        expect(log.attributes['session.id']).toStrictEqual(sessionId);
        expect(log.attributes['browser.tab.id']).toStrictEqual(tabId);
        expect(log.resource.attributes['session.id']).toBeUndefined();
    }

    const starts = logs.filter((l) => l.eventName === 'session.start');
    expect(starts.length).toStrictEqual(1);
    expect(starts[0].attributes['session.previous_id']).toBeUndefined();
});

test('should keep session and tab ids across reloads and share session between tabs', async ({
    context,
    page,
}) => {
    const collector = createCollector(page);
    await page.goto(FIXTURE);
    const [first] = await collector.getLogs();

    collector.clear();
    await page.reload();
    const reloaded = await collector.getLogs();
    expect(reloaded[0].attributes['session.id']).toStrictEqual(
        first.attributes['session.id']
    );
    expect(reloaded[0].attributes['browser.tab.id']).toStrictEqual(
        first.attributes['browser.tab.id']
    );
    expect(reloaded.some((l) => l.eventName === 'session.start')).toBe(false);

    const otherPage = await context.newPage();
    const otherCollector = createCollector(otherPage);
    await otherPage.goto(FIXTURE);
    const [other] = await otherCollector.getLogs();
    expect(other.attributes['session.id']).toStrictEqual(
        first.attributes['session.id']
    );
    expect(other.attributes['browser.tab.id']).not.toStrictEqual(
        first.attributes['browser.tab.id']
    );
});

test('should rotate the session after 30 minutes of inactivity', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.clock.install();
    await page.goto(FIXTURE);

    await page.click('body > h1');
    await page.clock.fastForward('29:00');
    await page.click('body > h1');
    await page.clock.fastForward('31:00');
    await page.click('body > h1');

    const {clicks, starts} = await getClickLogs(collector, 3);
    const [first, active, idle] = clicks.map((l) => l.attributes);

    expect(active['session.id']).toStrictEqual(first['session.id']);
    expect(idle['session.id']).not.toStrictEqual(first['session.id']);
    expect(idle['session.previous_id']).toStrictEqual(first['session.id']);
    expect(idle['browser.tab.id']).toStrictEqual(first['browser.tab.id']);

    expect(starts.length).toStrictEqual(2);
    expect(starts[1].attributes['session.id']).toStrictEqual(
        idle['session.id']
    );
    expect(starts[1].attributes['session.previous_id']).toStrictEqual(
        first['session.id']
    );
});

test('should rotate an active session after 4 hours', async ({page}) => {
    const collector = createCollector(page);
    await page.clock.install();
    await page.goto(FIXTURE);

    // Activity every 25 minutes keeps the session alive until it reaches 4h
    for (let i = 0; i < 10; i++) {
        await page.click('body > h1');
        await page.clock.fastForward('25:00');
    }
    await page.click('body > h1');

    const {clicks} = await getClickLogs(collector, 11);
    const ids = clicks.map((l) => l.attributes['session.id']);
    const firstId = ids[0];

    expect(ids.slice(0, 10).every((id) => id === firstId)).toBe(true);
    expect(ids[10]).not.toStrictEqual(firstId);
    expect(clicks[10].attributes['session.previous_id']).toStrictEqual(firstId);
});

test('should not add session attributes when disabled', async ({page}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({session: {enabled: false}})
    );
    await page.goto(`${FIXTURE}?config=${config}`);

    const logs = await collector.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    for (const log of logs) {
        expect(log.attributes['session.id']).toBeUndefined();
        expect(log.attributes['browser.tab.id']).toBeUndefined();
    }
});
