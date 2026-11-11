/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {resolveActivityEvents} from '../../lib/session/activity.js';
import {generateUUID} from '../../lib/session/id.js';
import {
    createSessionManager,
    SessionManager,
} from '../../lib/session/manager.js';
import {SessionSampler} from '../../lib/session/sampler.js';
import {
    SESSION_STORAGE_KEY,
    TAB_STORAGE_KEY,
} from '../../lib/session/storage.js';
import {UUID_V4, MemoryStorage, setup, observe} from './session-utils.js';

test('SessionManager - start creates and persists a session', () => {
    const {create, started, sessionStorage} = setup();
    const manager = create();
    manager.start();

    const attrs = manager.getAttributes();
    assert.match(String(attrs['session.id']), UUID_V4);
    assert.match(String(attrs['browser.tab.id']), UUID_V4);
    assert.strictEqual(attrs['session.previous_id'], undefined);
    assert.strictEqual(started.length, 1);

    const stored = JSON.parse(
        sessionStorage.getItem(SESSION_STORAGE_KEY) ?? ''
    );
    assert.strictEqual(stored.id, attrs['session.id']);
});

test('SessionManager - reuses the session across reloads and tabs', () => {
    const {createStarted, started} = setup();
    const first = createStarted().getAttributes();

    const reloaded = createStarted().getAttributes();
    assert.strictEqual(reloaded['session.id'], first['session.id']);
    assert.strictEqual(reloaded['browser.tab.id'], first['browser.tab.id']);

    const otherTab = createStarted(new MemoryStorage()).getAttributes();
    assert.strictEqual(otherTab['session.id'], first['session.id']);
    assert.notStrictEqual(otherTab['browser.tab.id'], first['browser.tab.id']);

    assert.strictEqual(started.length, 1);
});

test('SessionManager - start renews an expired session and keeps previous id', () => {
    const {create, clock} = setup();
    const first = create().getSession();

    clock.now += 61_000;
    const reloaded = create();
    reloaded.start();

    const second = reloaded.getSession();
    assert.notStrictEqual(second?.id, first?.id);
    assert.strictEqual(second?.previousId, first?.id);
});

test('SessionManager - an expired session is not renewed by telemetry', () => {
    const {createStarted, clock, started, sessionStorage} = setup();
    const manager = createStarted();
    const first = manager.getSession();
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);

    clock.now += 61_000;

    assert.strictEqual(manager.getSession(), undefined);
    assert.strictEqual(manager.getSessionId(), null);
    const attrs = manager.getAttributes();
    assert.strictEqual(attrs['session.id'], undefined);
    assert.strictEqual(attrs['session.previous_id'], undefined);
    assert.match(String(attrs['browser.tab.id']), UUID_V4);
    assert.strictEqual(started.length, 1);
    assert.strictEqual(sessionStorage.getItem(SESSION_STORAGE_KEY), stored);
    assert.ok(first);
});

test('SessionManager - user activity renews an expired session', () => {
    const {createStarted, clock, started} = setup();
    const manager = createStarted();
    const first = manager.getSession();

    clock.now += 61_000;
    manager.recordActivity();

    const second = manager.getSession();
    assert.notStrictEqual(second?.id, first?.id);
    assert.strictEqual(second?.previousId, first?.id);
    assert.strictEqual(
        manager.getAttributes()['session.previous_id'],
        first?.id
    );
    assert.strictEqual(started.length, 2);
});

test('SessionManager - drops previous id older than 24 hours', () => {
    const {create, clock} = setup();
    const manager = create();
    manager.getSession();

    clock.now += 24 * 60 * 60 * 1000;
    manager.recordActivity();

    assert.strictEqual(manager.getSession()?.previousId, undefined);
    assert.strictEqual(
        manager.getAttributes()['session.previous_id'],
        undefined
    );
});

test('SessionManager - user activity extends the session until max duration', () => {
    const {createStarted, clock} = setup();
    const manager = createStarted();
    const first = manager.getSession();

    // active every 30s for just under 10 minutes
    for (let i = 0; i < 19; i++) {
        clock.now += 30_000;
        manager.recordActivity();
        assert.strictEqual(manager.getSession()?.id, first?.id);
    }

    clock.now += 30_000;
    manager.recordActivity();
    assert.notStrictEqual(manager.getSession()?.id, first?.id);
});

test('SessionManager - telemetry does not extend the session', () => {
    const {create, clock} = setup();
    const manager = create();
    manager.getSession();

    clock.now += 40_000;
    manager.getAttributes();
    clock.now += 40_000;

    assert.strictEqual(manager.getSession(), undefined);
});

test('SessionManager - presence extends an active session but never renews', () => {
    const {create, clock} = setup();
    const manager = create();
    const first = manager.getSession();

    clock.now += 40_000;
    manager.recordActivity({renew: false});
    clock.now += 40_000;
    assert.strictEqual(manager.getSession()?.id, first?.id);

    clock.now += 61_000;
    manager.recordActivity({renew: false});
    assert.strictEqual(manager.getSession(), undefined);
});

test('SessionManager - activity in another tab keeps the session alive', () => {
    const {createStarted, clock} = setup();
    const tabA = createStarted();
    const tabB = createStarted(new MemoryStorage());
    const first = tabA.getSession();

    clock.now += 40_000;
    tabB.recordActivity();
    clock.now += 40_000;

    assert.strictEqual(tabA.getSession()?.id, first?.id);
});

test('SessionManager - ignores activity bursts within the write throttle', () => {
    const {create, clock, sessionStorage} = setup();
    const manager = create();
    manager.getSession();
    clock.now += 10_000;
    manager.recordActivity();
    const writes = sessionStorage.getItem(SESSION_STORAGE_KEY);

    clock.now += 1_000;
    manager.recordActivity();

    assert.strictEqual(sessionStorage.getItem(SESSION_STORAGE_KEY), writes);
});

test('SessionManager - adopts a session rotated by another tab', () => {
    const {create, sessionStorage} = setup();
    const tabA = create();
    tabA.getSession();

    const rotated = {
        id: generateUUID(),
        startTimestamp: 1_000_000,
        lastActivityTimestamp: 1_000_000,
        sampled: true,
        samplingRate: 1,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(rotated));

    assert.strictEqual(tabA.getSessionId(), rotated.id);
});

test('SessionManager - only the tab creating a session reports its start', () => {
    const {create, started, sessionStorage} = setup();
    const tabA = create();
    tabA.start();
    const first = tabA.getSessionId();
    // Joining an existing session does not start one
    const tabB = create(new MemoryStorage());
    tabB.start();
    assert.strictEqual(tabB.getSessionId(), first);

    // Neither does adopting a session rotated by another tab
    const rotated = {
        id: generateUUID(),
        startTimestamp: 1_000_000,
        lastActivityTimestamp: 1_000_000,
        sampled: true,
        samplingRate: 1,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(rotated));
    tabA.recordActivity();
    tabB.getSession();
    assert.strictEqual(tabA.getSessionId(), rotated.id);
    assert.strictEqual(tabB.getSessionId(), rotated.id);

    assert.deepStrictEqual(
        started.map((s) => s.id),
        [first]
    );
});

test('SessionManager - ignores malformed stored data', () => {
    const {createStarted, sessionStorage} = setup();
    sessionStorage.setItem(SESSION_STORAGE_KEY, '{"id": 42}');
    const id = createStarted().getSessionId();
    assert.match(String(id), UUID_V4);

    sessionStorage.setItem(SESSION_STORAGE_KEY, 'not json');
    assert.match(String(createStarted().getSessionId()), UUID_V4);
});

test('SessionManager - keeps the session in memory when storage writes fail', () => {
    const {createStarted, sessionStorage, started} = setup();
    const manager = createStarted();
    sessionStorage.failWrites = true;

    const id = manager.getSessionId();
    assert.strictEqual(manager.getSessionId(), id);
    assert.strictEqual(started.length, 1);
});

test('SessionManager - reuses the tab id stored in tab storage', () => {
    const {create, tabStorage} = setup();
    tabStorage.setItem(TAB_STORAGE_KEY, 'existing-tab');
    assert.strictEqual(
        create().getAttributes()['browser.tab.id'],
        'existing-tab'
    );
});

test('SessionManager observers - notify when a session starts', () => {
    const {create} = setup();
    const manager = create();
    const {calls, previous} = observe(manager);

    manager.start();
    const first = manager.getSession();
    manager.getSession();

    assert.deepStrictEqual(calls, [`started:${first?.id}`]);
    assert.strictEqual(previous[0], undefined);
});

test('SessionManager observers - notify when the timer expires the session', () => {
    const {create, advance} = setup();
    const manager = create();
    manager.start();
    const first = manager.getSession();
    const {calls} = observe(manager);

    advance(59_000);
    assert.deepStrictEqual(calls, []);

    advance(1_000);
    assert.deepStrictEqual(calls, [`ended:${first?.id}`]);
    assert.strictEqual(manager.getSession(), undefined);
});

test('SessionManager observers - activity postpones the expiry timer', () => {
    const {create, advance} = setup();
    const manager = create();
    manager.start();
    const first = manager.getSession();
    const {calls} = observe(manager);

    advance(40_000);
    manager.recordActivity();
    advance(40_000);
    assert.deepStrictEqual(calls, []);

    advance(20_000);
    assert.deepStrictEqual(calls, [`ended:${first?.id}`]);
});

test('SessionManager observers - timer re-arms when another tab extended the session', () => {
    const {create, advance} = setup();
    const tabA = create();
    const tabB = create(new MemoryStorage());
    tabA.start();
    const first = tabA.getSession();
    const {calls} = observe(tabA);

    advance(40_000);
    tabB.recordActivity();
    advance(30_000);
    assert.deepStrictEqual(calls, []);

    advance(30_000);
    assert.deepStrictEqual(calls, [`ended:${first?.id}`]);
});

test('SessionManager observers - the max duration timer ends an active session', () => {
    const {create, advance} = setup();
    const manager = create();
    manager.start();
    const first = manager.getSession();
    const {calls} = observe(manager);

    for (let i = 0; i < 19; i++) {
        advance(30_000);
        manager.recordActivity();
    }
    assert.deepStrictEqual(calls, []);

    advance(30_000);
    assert.deepStrictEqual(calls, [`ended:${first?.id}`]);
});

test('SessionManager observers - end is reported once and renewal starts a new session', () => {
    const {create, advance} = setup();
    const manager = create();
    manager.start();
    const first = manager.getSession();
    const {calls, previous} = observe(manager);

    advance(61_000);
    manager.getSession();
    manager.recordActivity();
    const second = manager.getSession();

    assert.deepStrictEqual(calls, [
        `ended:${first?.id}`,
        `started:${second?.id}`,
    ]);
    assert.strictEqual(previous[0]?.id, first?.id);
});

test('SessionManager observers - lazy reads report an expiry the timer missed', () => {
    const {create, clock} = setup();
    const manager = create();
    manager.start();
    const first = manager.getSession();
    const {calls} = observe(manager);

    // e.g. a throttled background tab
    clock.now += 61_000;
    manager.getAttributes();
    manager.getAttributes();

    assert.deepStrictEqual(calls, [`ended:${first?.id}`]);
});

test('SessionManager observers - report a session rotated by another tab', () => {
    const {createStarted, sessionStorage} = setup();
    const tabA = createStarted();
    const first = tabA.getSession();
    const {calls} = observe(tabA);

    const rotated = {
        id: generateUUID(),
        startTimestamp: 1_000_000,
        lastActivityTimestamp: 1_000_000,
        sampled: true,
        samplingRate: 1,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(rotated));
    tabA.getSession();
    tabA.getSession();

    assert.deepStrictEqual(calls, [
        `ended:${first?.id}`,
        `started:${rotated.id}`,
    ]);
});

test('SessionManager observers - end events do not see the next session', () => {
    const {create, advance} = setup();
    const manager = create();
    manager.start();
    /** @type {unknown[]} */
    const seen = [];
    manager.addObserver({
        onSessionEnded: () => seen.push(manager.getSession()),
    });

    advance(61_000);

    assert.deepStrictEqual(seen, [undefined]);
});

test('SessionManager observers - support several observers and unsubscribe', () => {
    const {create, advance} = setup();
    const manager = create();
    manager.start();
    const a = observe(manager);
    const b = observe(manager);

    advance(61_000);
    a.unsubscribe();
    manager.recordActivity();

    assert.strictEqual(a.calls.length, 1);
    assert.strictEqual(b.calls.length, 2);
});

test('SessionManager observers - accept partial observers', () => {
    const {create, advance} = setup();
    const manager = create();
    let ended = 0;
    manager.addObserver({onSessionEnded: () => ended++});
    manager.start();

    assert.doesNotThrow(() => advance(61_000));
    assert.strictEqual(ended, 1);
});

test('SessionManager observers - a throwing observer does not break others', () => {
    const {create, advance} = setup();
    const manager = create();
    manager.start();
    manager.addObserver({
        onSessionEnded: () => {
            throw new Error('boom');
        },
    });
    const {calls} = observe(manager);

    assert.doesNotThrow(() => advance(61_000));
    assert.strictEqual(calls.length, 1);
});

test('SessionManager observers - can read the session without re-notifying', () => {
    const {create, advance} = setup();
    const manager = create();
    manager.start();
    let calls = 0;
    manager.addObserver({
        onSessionStarted: () => {
            calls++;
            manager.getAttributes();
        },
    });

    advance(61_000);
    manager.recordActivity();
    assert.strictEqual(calls, 1);
});

test('SessionManager - shutdown clears the expiry timer', () => {
    const {create, activeTimers} = setup();
    const manager = create();
    manager.start();
    assert.strictEqual(activeTimers().length, 1);

    manager.shutdown();
    assert.strictEqual(activeTimers().length, 0);
});

test('SessionManager - keeps a single expiry timer', () => {
    const {create, clock, activeTimers} = setup();
    const manager = create();
    manager.start();
    for (let i = 0; i < 5; i++) {
        clock.now += 10_000;
        manager.recordActivity();
    }
    assert.strictEqual(activeTimers().length, 1);
});

test('SessionManager observers - keep prototype methods and `this`', () => {
    const {create, advance} = setup();
    const manager = create();
    manager.start();
    class Analytics {
        constructor() {
            /** @type {string[]} */
            this.ended = [];
        }
        /** @param {{id: string}} session */
        onSessionEnded(session) {
            this.ended.push(session.id);
        }
    }
    const analytics = new Analytics();
    manager.addObserver(analytics);
    const first = manager.getSession();

    advance(61_000);

    assert.deepStrictEqual(analytics.ended, [first?.id]);
});

test('SessionManager observers - report a renewal once when onSessionEnded reads the session', () => {
    const {create, clock, started} = setup();
    const manager = create();
    manager.start();
    const first = manager.getSession();
    /** @type {string[]} */
    const calls = [];
    manager.addObserver({
        onSessionEnded: (s) => {
            calls.push(`ended:${s.id}`);
            manager.getAttributes();
        },
        onSessionStarted: (s) => calls.push(`started:${s.id}`),
    });

    // No timer fires: the end is found by the activity itself
    clock.now += 61_000;
    manager.recordActivity();
    const second = manager.getSession();

    assert.deepStrictEqual(calls, [
        `ended:${first?.id}`,
        `started:${second?.id}`,
    ]);
    assert.strictEqual(started.length, 2);
});

test('SessionManager observers - report a session adopted from another tab once when onSessionEnded reads the session', () => {
    const {create, sessionStorage} = setup();
    const tabA = create();
    tabA.start();
    const first = tabA.getSession();
    /** @type {string[]} */
    const calls = [];
    tabA.addObserver({
        onSessionEnded: (s) => {
            calls.push(`ended:${s.id}`);
            tabA.getAttributes();
        },
        onSessionStarted: (s) => calls.push(`started:${s.id}`),
    });

    const rotated = {
        id: generateUUID(),
        startTimestamp: 1_000_000,
        lastActivityTimestamp: 1_000_000,
        sampled: true,
        samplingRate: 1,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(rotated));
    tabA.getSession();

    assert.deepStrictEqual(calls, [
        `ended:${first?.id}`,
        `started:${rotated.id}`,
    ]);
});

test('SessionManager - renews on the first activity after the timer ended the session, even within the throttle window', () => {
    const {create, advance} = setup();
    const manager = create();
    manager.start();
    const first = manager.getSession();
    for (let i = 0; i < 19; i++) {
        advance(30_000);
        manager.recordActivity();
    }
    advance(27_000);
    manager.recordActivity();

    advance(3_000);
    assert.strictEqual(manager.getSession(), undefined);
    advance(1_000);
    manager.recordActivity();

    const second = manager.getSession();
    assert.ok(second);
    assert.notStrictEqual(second.id, first?.id);
});

test('SessionManager - renews on the first activity after an unnoticed expiry, even within the throttle window', () => {
    const {create, advance, clock} = setup();
    const manager = create();
    manager.start();
    const first = manager.getSession();
    for (let i = 0; i < 19; i++) {
        advance(30_000);
        manager.recordActivity();
    }
    advance(27_000);
    manager.recordActivity();

    // e.g. a throttled background tab: the timer did not fire
    clock.now += 4_000;
    manager.recordActivity();

    const second = manager.getSession();
    assert.ok(second);
    assert.notStrictEqual(second.id, first?.id);
});

test('SessionManager - shutdown stops the manager completely', () => {
    const {create, sessionStorage, activeTimers} = setup();
    const manager = create();
    manager.start();
    const {calls} = observe(manager);
    manager.shutdown();

    // another tab rotates the session
    sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
            id: generateUUID(),
            startTimestamp: 1_000_000,
            lastActivityTimestamp: 1_000_000,
            sampled: true,
            samplingRate: 1,
        })
    );
    manager.recordActivity();
    const late = manager.addObserver({
        onSessionStarted: () => calls.push('late'),
    });

    assert.strictEqual(manager.getSession(), undefined);
    assert.strictEqual(manager.getAttributes()['session.id'], undefined);
    assert.deepStrictEqual(calls, []);
    assert.strictEqual(activeTimers().length, 0);
    assert.doesNotThrow(() => late());
});

test('SessionManager observers - previous is only reported when it is the real previous session', () => {
    const {create, sessionStorage, advance} = setup();
    const tab = create();
    tab.start();
    const first = tab.getSession();
    const {previous} = observe(tab);

    advance(61_000);
    // meanwhile other tabs ran two more sessions
    const second = {
        id: generateUUID(),
        previousId: first?.id,
        startTimestamp: 1_070_000,
        lastActivityTimestamp: 1_070_000,
        sampled: true,
        samplingRate: 1,
    };
    const third = {
        id: generateUUID(),
        previousId: second.id,
        startTimestamp: 1_080_000,
        lastActivityTimestamp: 1_080_000,
        sampled: true,
        samplingRate: 1,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(third));
    advance(5_000);
    tab.getSession();

    assert.strictEqual(tab.getSession()?.previousId, second.id);
    assert.deepStrictEqual(previous, [undefined]);
});

test('SessionManager observers - previous is reported when this tab saw it end', () => {
    const {create, advance} = setup();
    const tab = create();
    tab.start();
    const first = tab.getSession();
    const {previous} = observe(tab);

    advance(61_000);
    tab.recordActivity();

    assert.strictEqual(previous.length, 1);
    assert.strictEqual(previous[0]?.id, first?.id);
});

test('createSessionManager - tolerates a null or invalid session config', (t) => {
    const originals = [globalThis.localStorage, globalThis.sessionStorage];
    // @ts-expect-error - node has no web storage
    globalThis.localStorage = new MemoryStorage();
    // @ts-expect-error - node has no web storage
    globalThis.sessionStorage = new MemoryStorage();
    t.after(() => {
        // @ts-expect-error - restore
        globalThis.localStorage = originals[0];
        // @ts-expect-error - restore
        globalThis.sessionStorage = originals[1];
    });

    for (const value of [null, 'yes', 42, true]) {
        // @ts-expect-error - testing invalid input
        assert.doesNotThrow(() => createSessionManager(value));
        // @ts-expect-error - testing invalid input
        assert.ok(createSessionManager(value));
    }
    assert.doesNotThrow(() => resolveActivityEvents(/** @type {any} */ (null)));
});

test('SessionManager - cleared storage ends the session and telemetry does not start another', () => {
    const {create, sessionStorage, started} = setup();
    const manager = create();
    manager.start();
    const first = manager.getSession();
    const {calls} = observe(manager);

    sessionStorage.clear();

    assert.strictEqual(manager.getSession(), undefined);
    assert.strictEqual(manager.getAttributes()['session.id'], undefined);
    assert.deepStrictEqual(calls, [`ended:${first?.id}`]);
    assert.strictEqual(started.length, 1);
    assert.strictEqual(sessionStorage.getItem(SESSION_STORAGE_KEY), null);
});

test('SessionManager - user activity starts a fresh session after storage was cleared', () => {
    const {create, sessionStorage, started} = setup();
    const manager = create();
    manager.start();
    const first = manager.getSession();

    sessionStorage.clear();
    manager.recordActivity();

    const second = manager.getSession();
    assert.ok(second);
    assert.notStrictEqual(second.id, first?.id);
    assert.strictEqual(second.previousId, undefined);
    assert.strictEqual(started.length, 2);
});

test('SessionManager - a stored session dated in the future is expired', () => {
    const {create, sessionStorage, clock, started} = setup();
    const plantedId = generateUUID();
    const future = clock.now + 10 * 60_000;
    sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
            id: plantedId,
            startTimestamp: future,
            lastActivityTimestamp: future,
            sampled: true,
            samplingRate: 1,
        })
    );
    const manager = create();
    manager.start();

    const session = manager.getSession();
    assert.ok(session);
    assert.notStrictEqual(session.id, plantedId);
    assert.strictEqual(started.length, 1);
});

test('SessionManager - keeps a session after a small clock correction', () => {
    const {create, sessionStorage, clock, started} = setup();
    const id = generateUUID();
    const slightlyAhead = clock.now + 30_000;
    sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
            id,
            startTimestamp: clock.now,
            lastActivityTimestamp: slightlyAhead,
            sampled: true,
            samplingRate: 1,
        })
    );
    const manager = create();
    manager.start();

    assert.strictEqual(manager.getSession()?.id, id);
    assert.strictEqual(started.length, 0);
});

test('SessionManager - never arms a timer longer than browsers support', () => {
    const {create, clock, activeTimers, advance} = setup({
        inactivityTimeout: 3_000_000,
        maxDuration: 3_000_000,
    });
    const manager = create();
    manager.start();
    const {calls} = observe(manager);
    const id = manager.getSession()?.id;

    const [timer] = activeTimers();
    assert.ok(timer.at - clock.now <= 2 ** 31 - 1);

    advance(3_000_000_000 + 1_000);
    assert.deepStrictEqual(calls, [`ended:${id}`]);
});

test('SessionManager - stores the sampling decision with the session', () => {
    const {create, sessionStorage} = setup({sampler: new SessionSampler(0)});
    const manager = create();
    manager.start();
    const session = manager.getSession();
    assert.strictEqual(session?.sampled, false);
    assert.strictEqual(session?.samplingRate, 0);
    assert.strictEqual(manager.getAttributes()['session.sampling_rate'], 0);

    // The decision survives reloads, it is not taken again
    const reloaded = create();
    assert.strictEqual(reloaded.getSession()?.id, session?.id);
    assert.strictEqual(reloaded.getSession()?.sampled, false);
    assert.ok(sessionStorage.getItem(SESSION_STORAGE_KEY));
});

test('SessionManager - exports without a session only when every session is sampled', () => {
    assert.strictEqual(
        setup({sampler: new SessionSampler(1)})
            .create()
            .exportsWithoutSession(),
        true
    );
    assert.strictEqual(
        setup({sampler: new SessionSampler(0.5)})
            .create()
            .exportsWithoutSession(),
        false
    );
});

test('SessionManager - endSession ends the session until the next activity', () => {
    const {createStarted, clock, started, activeTimers} = setup();
    const manager = createStarted();
    const first = manager.getSession();
    const {calls, previous} = observe(manager);

    manager.endSession();

    assert.deepStrictEqual(calls, [`ended:${first?.id}`]);
    assert.strictEqual(manager.getSession(), undefined);
    assert.strictEqual(manager.getAttributes()['session.id'], undefined);
    assert.strictEqual(activeTimers().length, 0);

    // Within the activity throttle window of the page load
    clock.now += 1_000;
    manager.recordActivity();

    const second = manager.getSession();
    assert.ok(second);
    assert.notStrictEqual(second.id, first?.id);
    assert.strictEqual(second.previousId, first?.id);
    assert.deepStrictEqual(calls, [
        `ended:${first?.id}`,
        `started:${second.id}`,
    ]);
    assert.strictEqual(previous[0]?.id, first?.id);
    assert.strictEqual(started.length, 2);
});

test('SessionManager - endSession is not undone by presence or a reload', () => {
    const {createStarted, create} = setup();
    const manager = createStarted();
    const first = manager.getSession();

    manager.endSession();
    manager.recordActivity({renew: false});
    assert.strictEqual(manager.getSession(), undefined);

    const reloaded = create();
    assert.strictEqual(reloaded.getSession(), undefined);
    reloaded.start();
    assert.strictEqual(reloaded.getSession()?.previousId, first?.id);
});

test('SessionManager - endSession ends the session in every tab', () => {
    const {createStarted, advance} = setup();
    const tabA = createStarted();
    const tabB = createStarted(new MemoryStorage());
    const first = tabA.getSession();
    const {calls} = observe(tabB);

    tabA.endSession();

    // Tab B notices on its expiry timer or its next read
    advance(61_000);
    assert.deepStrictEqual(calls, [`ended:${first?.id}`]);

    tabB.recordActivity();
    const second = tabB.getSession();
    assert.strictEqual(second?.previousId, first?.id);
    assert.strictEqual(tabA.getSession()?.id, second?.id);
});

test('SessionManager - endSession does nothing without an active session', () => {
    const {createStarted, clock, sessionStorage} = setup();
    const manager = createStarted();
    const {calls} = observe(manager);
    manager.endSession();
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);

    manager.endSession();
    clock.now += 61_000;
    manager.endSession();

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(sessionStorage.getItem(SESSION_STORAGE_KEY), stored);
});

test('SessionManager - endSession does nothing after shutdown', () => {
    const {createStarted, sessionStorage} = setup();
    const manager = createStarted();
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    manager.shutdown();

    manager.endSession();

    assert.strictEqual(sessionStorage.getItem(SESSION_STORAGE_KEY), stored);
});
