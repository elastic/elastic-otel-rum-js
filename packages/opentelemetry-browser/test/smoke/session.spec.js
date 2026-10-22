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

test('should not let telemetry extend the session', async ({page}) => {
    const collector = createCollector(page);
    await page.clock.install();
    await page.goto(FIXTURE);

    await page.click('body > h1');
    await page.clock.fastForward('29:00');
    // Produces fetch spans and logs but is not user activity
    await page.evaluate(() => fetch('/').then((r) => r.text()));
    await page.clock.fastForward('29:00');
    await page.click('body > h1');

    const {clicks} = await getClickLogs(collector, 2);
    expect(clicks[1].attributes['session.id']).not.toStrictEqual(
        clicks[0].attributes['session.id']
    );
});

test('should extend the session on user activity without telemetry', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.clock.install();
    await page.goto(FIXTURE);

    await page.click('body > h1');
    await page.clock.fastForward('29:00');
    await page.keyboard.press('a');
    await page.clock.fastForward('29:00');
    await page.click('body > h1');

    const {clicks} = await getClickLogs(collector, 2);
    expect(clicks[1].attributes['session.id']).toStrictEqual(
        clicks[0].attributes['session.id']
    );
});

test('should use the configured activity events', async ({page}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({session: {activityEvents: ['keydown']}})
    );
    await page.clock.install();
    await page.goto(`${FIXTURE}?config=${config}`);

    await page.click('body > h1');
    await page.clock.fastForward('29:00');
    // pointerdown is not in the configured events so this click can't extend
    await page.click('body > h1');
    await page.clock.fastForward('29:00');
    await page.click('body > h1');

    const {clicks} = await getClickLogs(collector, 3);
    expect(clicks[1].attributes['session.id']).toStrictEqual(
        clicks[0].attributes['session.id']
    );
    expect(clicks[2].attributes['session.id']).not.toStrictEqual(
        clicks[0].attributes['session.id']
    );
});

test('should not tag telemetry produced after the session expired', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.clock.install();
    await page.goto(FIXTURE);

    await page.click('body > h1');
    await page.clock.fastForward('31:00');
    await page.evaluate(() => fetch('/').then((r) => r.text()));

    const spans = await collector.getSpans();
    const [fetchSpan] = spans.filter(
        (s) => s.scope.name === '@opentelemetry/browser-instrumentation/fetch'
    );
    expect(fetchSpan.attributes['session.id']).toBeUndefined();
    expect(fetchSpan.attributes['session.previous_id']).toBeUndefined();
    expect(fetchSpan.attributes['browser.tab.id']).toBeDefined();

    // The next user interaction starts a new session
    await page.click('body > h1');
    const {clicks} = await getClickLogs(collector, 2);
    expect(clicks[1].attributes['session.id']).toBeDefined();
    expect(clicks[1].attributes['session.previous_id']).toStrictEqual(
        clicks[0].attributes['session.id']
    );
});

test('should ignore synthetic events as user activity', async ({page}) => {
    const collector = createCollector(page);
    await page.clock.install();
    await page.goto(FIXTURE);

    await page.click('body > h1');
    await page.clock.fastForward('29:00');
    await page.evaluate(() =>
        window.dispatchEvent(new KeyboardEvent('keydown', {key: 'a'}))
    );
    await page.clock.fastForward('29:00');
    await page.click('body > h1');

    const {clicks} = await getClickLogs(collector, 2);
    expect(clicks[1].attributes['session.id']).not.toStrictEqual(
        clicks[0].attributes['session.id']
    );
});

test('should notify session observers when the session ends and starts', async ({
    page,
}) => {
    await page.clock.install();
    await page.goto(FIXTURE);

    const initial = await page.evaluate(() =>
        // @ts-expect-error - set by the injected snippet
        globalThis.edotBrowser.session.getSession()
    );
    await page.evaluate(() => {
        // @ts-expect-error - test globals
        globalThis.sessionEvents = [];
        // @ts-expect-error - set by the injected snippet
        globalThis.edotBrowser.session.addObserver({
            onSessionStarted: (/** @type {any} */ s, /** @type {any} */ p) =>
                // @ts-expect-error - test globals
                globalThis.sessionEvents.push(['started', s, p]),
            onSessionEnded: (/** @type {any} */ s) =>
                // @ts-expect-error - test globals
                globalThis.sessionEvents.push(['ended', s]),
        });
    });

    // The expiry timer reports the end without any telemetry or interaction
    await page.clock.fastForward('31:00');
    // @ts-expect-error - test globals
    let events = await page.evaluate(() => globalThis.sessionEvents);
    expect(events.map((e) => e[0])).toStrictEqual(['ended']);
    expect(events[0][1].id).toStrictEqual(initial.id);
    expect(
        await page.evaluate(() =>
            // @ts-expect-error - set by the injected snippet
            globalThis.edotBrowser.session.getSession()
        )
    ).toBeUndefined();

    await page.click('body > h1');
    // @ts-expect-error - test globals
    events = await page.evaluate(() => globalThis.sessionEvents);
    expect(events.map((e) => e[0])).toStrictEqual(['ended', 'started']);
    expect(events[1][1].id).not.toStrictEqual(initial.id);
    expect(events[1][1].previousId).toStrictEqual(initial.id);
    expect(events[1][2].id).toStrictEqual(initial.id);
});

test('should keep an active session alive while the tab is visible again', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.clock.install();
    await page.goto(FIXTURE);

    await page.click('body > h1');
    await page.clock.fastForward('29:00');
    await page.evaluate(() =>
        document.dispatchEvent(new Event('visibilitychange'))
    );
    await page.clock.fastForward('29:00');
    await page.click('body > h1');

    const {clicks} = await getClickLogs(collector, 2);
    expect(clicks[1].attributes['session.id']).toStrictEqual(
        clicks[0].attributes['session.id']
    );
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

    const session = await page.evaluate(() =>
        // @ts-expect-error - set by the injected snippet
        globalThis.edotBrowser.session.getSession()
    );
    expect(session).toBeUndefined();
    expect(
        await page.evaluate(
            () =>
                // @ts-expect-error - set by the injected snippet
                typeof globalThis.edotBrowser.session.addObserver({})
        )
    ).toStrictEqual('function');
});

test('should stop tracking the session on shutdown', async ({page}) => {
    await page.clock.install();
    await page.goto(FIXTURE);

    await page.evaluate(async () => {
        // @ts-expect-error - test globals
        globalThis.sessionEvents = [];
        // @ts-expect-error - set by the injected snippet
        globalThis.edotBrowser.session.addObserver({
            onSessionStarted: () =>
                // @ts-expect-error - test globals
                globalThis.sessionEvents.push('started'),
            onSessionEnded: () =>
                // @ts-expect-error - test globals
                globalThis.sessionEvents.push('ended'),
        });
        // @ts-expect-error - set by the injected snippet
        await globalThis.edotBrowser.shutdown();
    });

    // Neither the expiry timer nor user activity reach the session anymore
    await page.clock.fastForward('31:00');
    await page.click('body > h1');
    // @ts-expect-error - test globals
    expect(await page.evaluate(() => globalThis.sessionEvents)).toStrictEqual(
        []
    );
});

test('should expose a no-op session API when the SDK does not start', async ({
    page,
}) => {
    const config = encodeURIComponent(JSON.stringify({disabled: true}));
    await page.goto(`${FIXTURE}?config=${config}`);

    const result = await page.evaluate(() => {
        // @ts-expect-error - set by the injected snippet
        const {session} = globalThis.edotBrowser;
        const unsubscribe = session.addObserver({});
        unsubscribe();
        return {
            session: session.getSession(),
            unsubscribe: typeof unsubscribe,
        };
    });
    expect(result).toStrictEqual({session: undefined, unsubscribe: 'function'});
});

test('should not print instrumentation details to the console', async ({
    page,
}) => {
    /** @type {string[]} */
    const messages = [];
    page.on('console', (msg) => messages.push(msg.text()));
    await page.goto(FIXTURE);

    expect(messages.filter((m) => m.startsWith('instr'))).toStrictEqual([]);
});

test('should start with a null session config', async ({page}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(JSON.stringify({session: null}));
    await page.goto(`${FIXTURE}?config=${config}`);

    const logs = await collector.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].attributes['session.id']).toMatch(/^[0-9a-f-]{36}$/);
});

test('should renew the session on a click right after the max duration ended it', async ({
    page,
}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({session: {maxDuration: 1800}})
    );
    await page.clock.install();
    await page.goto(`${FIXTURE}?config=${config}`);

    // activity processed 3s before the max duration, which ends the session
    await page.clock.fastForward('29:57');
    await page.click('body > h1');
    await page.clock.fastForward('00:04');
    await page.click('body > h1');

    const {clicks} = await getClickLogs(collector, 2);
    expect(clicks[0].attributes['session.id']).toBeDefined();
    expect(clicks[1].attributes['session.id']).toBeDefined();
    expect(clicks[1].attributes['session.id']).not.toStrictEqual(
        clicks[0].attributes['session.id']
    );
});

test('should not notify observers after shutdown when another tab rotates the session', async ({
    page,
}) => {
    await page.clock.install();
    await page.goto(FIXTURE);

    const events = await page.evaluate(async () => {
        /** @type {string[]} */
        const seen = [];
        // @ts-expect-error - set by the injected snippet
        const {session, shutdown} = globalThis.edotBrowser;
        session.addObserver({
            onSessionStarted: () => seen.push('started'),
            onSessionEnded: () => seen.push('ended'),
        });
        await shutdown();

        // what another tab rotating the session leaves in the shared storage
        localStorage.setItem(
            'elastic_otel_browser.session',
            JSON.stringify({
                id: crypto.randomUUID(),
                startTimestamp: Date.now(),
                lastActivityTimestamp: Date.now(),
            })
        );
        const after = session.getSession();
        return {seen, after};
    });

    expect(events.seen).toStrictEqual([]);
    expect(events.after).toBeUndefined();
});
