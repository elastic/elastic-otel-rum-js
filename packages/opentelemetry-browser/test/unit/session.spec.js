/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {diag, DiagLogLevel} from '@opentelemetry/api';

import {
    createSessionApi,
    createSessionManager,
    DEFAULT_ACTIVITY_EVENTS,
    generateUUID,
    resolveActivityEvents,
    resolveSessionTimeouts,
    SESSION_STORAGE_KEY,
    SessionManager,
    TAB_STORAGE_KEY,
    trackUserActivity,
} from '../../lib/session.js';

const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

class MemoryStorage {
    constructor() {
        /** @type {Map<string, string>} */
        this.map = new Map();
        this.failWrites = false;
    }
    get length() {
        return this.map.size;
    }
    clear() {
        this.map.clear();
    }
    /** @param {number} i */
    key(i) {
        return [...this.map.keys()][i] ?? null;
    }
    /** @param {string} k */
    getItem(k) {
        return this.map.get(k) ?? null;
    }
    /** @param {string} k @param {string} v */
    setItem(k, v) {
        if (this.failWrites) {
            throw new Error('QuotaExceededError');
        }
        this.map.set(k, v);
    }
    /** @param {string} k */
    removeItem(k) {
        this.map.delete(k);
    }
}

/**
 * @param {Partial<import('../../lib/session.js').SessionManagerOptions>} [opts]
 */
function setup(opts = {}) {
    const clock = {now: 1_000_000};
    /** @type {import('../../lib/session.js').SessionState[]} */
    const started = [];
    const sessionStorage = new MemoryStorage();
    const tabStorage = new MemoryStorage();
    /** @type {{fn: () => void, at: number, cleared: boolean}[]} */
    const pending = [];
    const timers = {
        /** @param {() => void} fn @param {number} ms */
        setTimeout(fn, ms) {
            const timer = {fn, at: clock.now + ms, cleared: false};
            pending.push(timer);
            return timer;
        },
        /** @param {{cleared: boolean}} timer */
        clearTimeout(timer) {
            timer.cleared = true;
        },
    };
    /** Moves the clock and runs the timers that became due. */
    const advance = (/** @type {number} */ ms) => {
        const target = clock.now + ms;
        for (;;) {
            const due = pending
                .filter((t) => !t.cleared && t.at <= target)
                .sort((a, b) => a.at - b.at)[0];
            if (!due) {
                break;
            }
            due.cleared = true;
            clock.now = Math.max(clock.now, due.at);
            due.fn();
        }
        clock.now = target;
    };
    const activeTimers = () => pending.filter((t) => !t.cleared);
    const create = (/** @type {MemoryStorage} */ tab = tabStorage) =>
        new SessionManager({
            sessionStorage,
            tabStorage: tab,
            inactivityTimeout: 60,
            maxDuration: 600,
            onSessionStart: (s) => started.push(s),
            now: () => clock.now,
            timers,
            ...opts,
        });
    return {
        clock,
        started,
        sessionStorage,
        tabStorage,
        create,
        advance,
        activeTimers,
    };
}

/**
 * Records observer calls as `started:<id>` / `ended:<id>` strings.
 * @param {SessionManager} manager
 */
function observe(manager) {
    /** @type {string[]} */
    const calls = [];
    /** @type {(import('../../lib/session.js').SessionInfo | undefined)[]} */
    const previous = [];
    const unsubscribe = manager.addObserver({
        onSessionStarted: (s, p) => {
            calls.push(`started:${s.id}`);
            previous.push(p);
        },
        onSessionEnded: (s) => calls.push(`ended:${s.id}`),
    });
    return {calls, previous, unsubscribe};
}

test('generateUUID - returns RFC 4122 v4 UUIDs', () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
        const id = generateUUID();
        assert.match(id, UUID_V4);
        ids.add(id);
    }
    assert.strictEqual(ids.size, 1000);
});

test('generateUUID - falls back to getRandomValues when randomUUID is unavailable', (t) => {
    const original = globalThis.crypto.randomUUID;
    t.after(() => {
        globalThis.crypto.randomUUID = original;
    });
    // @ts-expect-error - simulate non secure context
    globalThis.crypto.randomUUID = undefined;
    assert.match(generateUUID(), UUID_V4);
});

test('resolveSessionTimeouts - uses defaults when not set', () => {
    assert.deepStrictEqual(resolveSessionTimeouts({}), {
        inactivityTimeout: 1800,
        maxDuration: 14400,
    });
});

test('resolveSessionTimeouts - keeps valid values', () => {
    assert.deepStrictEqual(
        resolveSessionTimeouts({inactivityTimeout: 600, maxDuration: 7200}),
        {inactivityTimeout: 600, maxDuration: 7200}
    );
});

test('resolveSessionTimeouts - falls back to defaults on invalid values', () => {
    for (const value of [0, -1, NaN, Infinity, '600']) {
        assert.deepStrictEqual(
            // @ts-expect-error - testing invalid input
            resolveSessionTimeouts({
                inactivityTimeout: value,
                maxDuration: value,
            }),
            {inactivityTimeout: 1800, maxDuration: 14400},
            `value: ${String(value)}`
        );
    }
});

test('resolveSessionTimeouts - clamps values to the allowed range', () => {
    assert.deepStrictEqual(
        resolveSessionTimeouts({inactivityTimeout: 60, maxDuration: 600}),
        {inactivityTimeout: 300, maxDuration: 1800}
    );
    assert.deepStrictEqual(
        resolveSessionTimeouts({maxDuration: 48 * 60 * 60}),
        {inactivityTimeout: 1800, maxDuration: 86400}
    );
});

test('resolveSessionTimeouts - caps inactivity at max duration', () => {
    assert.deepStrictEqual(
        resolveSessionTimeouts({inactivityTimeout: 7200, maxDuration: 3600}),
        {inactivityTimeout: 3600, maxDuration: 3600}
    );
});

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
    const {create, started} = setup();
    const first = create().getAttributes();

    const reloaded = create().getAttributes();
    assert.strictEqual(reloaded['session.id'], first['session.id']);
    assert.strictEqual(reloaded['browser.tab.id'], first['browser.tab.id']);

    const otherTab = create(new MemoryStorage()).getAttributes();
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
    const {create, clock, started, sessionStorage} = setup();
    const manager = create();
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
    const {create, clock, started} = setup();
    const manager = create();
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
    const {create, clock} = setup();
    const manager = create();
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
    const {create, clock} = setup();
    const tabA = create();
    const tabB = create(new MemoryStorage());
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
    const {create, sessionStorage} = setup();
    sessionStorage.setItem(SESSION_STORAGE_KEY, '{"id": 42}');
    const id = create().getSessionId();
    assert.match(String(id), UUID_V4);

    sessionStorage.setItem(SESSION_STORAGE_KEY, 'not json');
    assert.match(String(create().getSessionId()), UUID_V4);
});

test('SessionManager - keeps the session in memory when storage writes fail', () => {
    const {create, sessionStorage, started} = setup();
    const manager = create();
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
    const {create, sessionStorage} = setup();
    const tabA = create();
    const first = tabA.getSession();
    const {calls} = observe(tabA);

    const rotated = {
        id: generateUUID(),
        startTimestamp: 1_000_000,
        lastActivityTimestamp: 1_000_000,
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

test('createSessionApi - exposes the current session without internals', () => {
    const {create} = setup();
    const manager = create();
    const api = createSessionApi(manager);

    const session = api.getSession();
    assert.deepStrictEqual(Object.keys(session ?? {}).sort(), [
        'id',
        'previousId',
        'startTimestamp',
    ]);
    assert.strictEqual(session?.id, manager.getSessionId());
});

test('createSessionApi - reports no session once it ended', () => {
    const {create, advance} = setup();
    const manager = create();
    manager.start();
    const api = createSessionApi(manager);

    advance(61_000);
    assert.strictEqual(api.getSession(), undefined);
});

test('createSessionApi - does not count reads as activity', () => {
    const {create, clock} = setup();
    const manager = create();
    const api = createSessionApi(manager);
    api.getSession();

    clock.now += 40_000;
    api.getSession();
    clock.now += 40_000;

    assert.strictEqual(api.getSession(), undefined);
});

test('createSessionApi - forwards observers without internals and their unsubscribe', () => {
    const {create, advance} = setup();
    const manager = create();
    manager.start();
    const api = createSessionApi(manager);
    /** @type {unknown[]} */
    const started = [];
    /** @type {unknown[]} */
    const ended = [];
    const off = api.addObserver({
        onSessionStarted: (s, p) => started.push([s, p]),
        onSessionEnded: (s) => ended.push(s),
    });

    advance(61_000);
    manager.recordActivity();
    off();
    advance(61_000);
    manager.recordActivity();

    assert.strictEqual(ended.length, 1);
    assert.strictEqual(started.length, 1);
    const [session, previous] = /** @type {any[]} */ (started[0]);
    assert.deepStrictEqual(Object.keys(session).sort(), [
        'id',
        'previousId',
        'startTimestamp',
    ]);
    assert.strictEqual(previous.id, /** @type {any} */ (ended[0]).id);
});

test('createSessionApi - is a no-op without a session manager', () => {
    const api = createSessionApi(undefined);
    assert.strictEqual(api.getSession(), undefined);
    assert.doesNotThrow(() => api.addObserver({})());
});

test('resolveActivityEvents - uses defaults when not set', () => {
    assert.deepStrictEqual(resolveActivityEvents({}), DEFAULT_ACTIVITY_EVENTS);
});

test('resolveActivityEvents - keeps a valid list', () => {
    assert.deepStrictEqual(
        resolveActivityEvents({activityEvents: ['click', 'keyup']}),
        ['click', 'keyup']
    );
});

test('resolveActivityEvents - falls back to defaults on invalid values', () => {
    for (const value of [[], 'click', [1], ['click', ''], null]) {
        assert.deepStrictEqual(
            // @ts-expect-error - testing invalid input
            resolveActivityEvents({activityEvents: value}),
            DEFAULT_ACTIVITY_EVENTS,
            `value: ${JSON.stringify(value)}`
        );
    }
});

/**
 * Minimal window and document stubs. Node events are never trusted, so
 * tests inject the trust check.
 * @param {import('node:test').TestContext} t
 * @param {{visibilityState?: string}} [docState]
 */
function stubBrowser(t, docState = {}) {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), {
        visibilityState: 'visible',
        ...docState,
    });
    // @ts-expect-error - minimal stubs
    globalThis.window = win;
    // @ts-expect-error - minimal stubs
    globalThis.document = doc;
    t.after(() => {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
    });
    return {win, doc};
}

const recorder = () => {
    /** @type {Array<{renew?: boolean} | undefined>} */
    const calls = [];
    return {
        calls,
        manager: {
            /** @param {{renew?: boolean}} [opts] */
            recordActivity: (opts) => {
                calls.push(opts);
            },
        },
    };
};

test('trackUserActivity - records activity on window events until stopped', (t) => {
    const {win} = stubBrowser(t);
    const {calls, manager} = recorder();
    const stop = trackUserActivity(manager, ['keydown', 'scroll'], () => true);

    win.dispatchEvent(new Event('keydown'));
    win.dispatchEvent(new Event('scroll'));
    win.dispatchEvent(new Event('click'));
    assert.strictEqual(calls.length, 2);

    stop();
    win.dispatchEvent(new Event('keydown'));
    assert.strictEqual(calls.length, 2);
});

test('trackUserActivity - ignores untrusted events', (t) => {
    const {win} = stubBrowser(t);
    const {calls, manager} = recorder();
    trackUserActivity(manager, ['keydown'], () => false);

    win.dispatchEvent(new Event('keydown'));
    assert.strictEqual(calls.length, 0);
});

test('trackUserActivity - treats a visible tab as presence that does not renew', (t) => {
    const {doc} = stubBrowser(t);
    const {calls, manager} = recorder();
    const stop = trackUserActivity(manager, ['keydown'], () => true);

    doc.dispatchEvent(new Event('visibilitychange'));
    assert.deepStrictEqual(calls, [{renew: false}]);

    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    assert.strictEqual(calls.length, 1);

    stop();
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    assert.strictEqual(calls.length, 1);
});

test('trackUserActivity - is a no-op without a window', (t) => {
    const original = globalThis.window;
    // @ts-expect-error - simulate a non browser environment
    delete globalThis.window;
    t.after(() => {
        globalThis.window = original;
    });
    const stop = trackUserActivity({recordActivity() {}}, ['keydown']);
    assert.doesNotThrow(() => stop());
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
    };
    const third = {
        id: generateUUID(),
        previousId: second.id,
        startTimestamp: 1_080_000,
        lastActivityTimestamp: 1_080_000,
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

/**
 * @param {() => void} fn
 * @returns {string[]} warnings emitted by `fn`
 */
function captureWarnings(fn) {
    /** @type {string[]} */
    const warnings = [];
    diag.setLogger(
        {
            warn: (msg) => warnings.push(msg),
            error() {},
            info() {},
            debug() {},
            verbose() {},
        },
        {logLevel: DiagLogLevel.WARN, suppressOverrideMessage: true}
    );
    try {
        fn();
    } finally {
        diag.disable();
    }
    return warnings;
}

test('resolveActivityEvents - accepts known events without warning', () => {
    const warnings = captureWarnings(() => {
        assert.deepStrictEqual(
            resolveActivityEvents({
                activityEvents: ['click', 'touchstart', 'pointermove', 'input'],
            }),
            ['click', 'touchstart', 'pointermove', 'input']
        );
        resolveActivityEvents({});
    });
    assert.deepStrictEqual(warnings, []);
});

test('resolveActivityEvents - warns about likely typos but keeps the events', () => {
    /** @type {string[]} */
    let events = [];
    const warnings = captureWarnings(() => {
        events = resolveActivityEvents({
            activityEvents: ['keyDown', 'pointerdwon', 'click'],
        });
    });
    assert.deepStrictEqual(events, ['keyDown', 'pointerdwon', 'click']);
    assert.strictEqual(warnings.length, 2);
    assert.match(warnings[0], /keyDown/);
    assert.match(warnings[1], /pointerdwon/);
});
