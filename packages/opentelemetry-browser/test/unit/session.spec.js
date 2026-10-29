/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {mock, test} from 'node:test';

import {
    generateUUID,
    resolveSessionTimeouts,
    SESSION_STORAGE_KEY,
    SessionManager,
    SessionSampler,
    SamplingDecision,
    TAB_STORAGE_KEY,
    SessionSpanProcessor,
    SessionLogRecordProcessor,
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
    const create = (/** @type {MemoryStorage} */ tab = tabStorage) => {
        const manager = new SessionManager({
            sessionStorage,
            tabStorage: tab,
            inactivityTimeout: 60,
            maxDuration: 600,
            now: () => clock.now,
            sampler: new SessionSampler(1),
            ...opts,
        });
        manager.observe('session:start', (s) => started.push(s));
        return manager;
    };
    return {clock, started, sessionStorage, tabStorage, create};
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
            resolveSessionTimeouts({
                // @ts-expect-error - testing invalid input
                inactivityTimeout: value,
                // @ts-expect-error - testing invalid input
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

test('SessionManager - creates and persists a session', () => {
    const {create, started, sessionStorage} = setup();
    const manager = create();

    const session = manager.getSession();
    assert.match(String(session.id), UUID_V4);
    assert.match(String(manager.getTabId()), UUID_V4);
    assert.strictEqual(session.previousId, undefined);
    assert.strictEqual(session.samplingRate, 1);
    assert.strictEqual(started.length, 1);

    const stored = JSON.parse(
        sessionStorage.getItem(SESSION_STORAGE_KEY) ?? ''
    );
    assert.strictEqual(stored.id, session.id);
});

test('SessionManager - reuses the session across reloads and tabs', () => {
    const {create, started} = setup();
    const firstManager = create();
    const firstSession = firstManager.getSession();

    const reloadedManager = create();
    const reloadedSession = reloadedManager.getSession();
    assert.strictEqual(reloadedSession['id'], firstSession['id']);
    assert.strictEqual(reloadedManager.getTabId(), firstManager.getTabId());
    assert.strictEqual(
        reloadedSession['samplingRate'],
        firstSession['samplingRate']
    );

    const otherTabManager = create(new MemoryStorage());
    const otherTabSession = otherTabManager.getSession();
    assert.strictEqual(otherTabSession['id'], firstSession['id']);
    assert.notStrictEqual(otherTabManager.getTabId(), firstManager.getTabId());
    assert.strictEqual(
        otherTabSession['samplingRate'],
        firstSession['samplingRate']
    );

    assert.strictEqual(started.length, 1);
});

test('SessionManager - rotates after inactivity and keeps previous id', () => {
    const {create, clock, started} = setup();
    const manager = create();
    const first = manager.getSession();

    clock.now += 59_000;
    assert.strictEqual(manager.getSession().id, first.id);

    clock.now += 60_000;
    const second = manager.getSession();
    assert.notStrictEqual(second.id, first.id);
    assert.strictEqual(second.previousId, first.id);
    assert.strictEqual(started.length, 2);
});

test('SessionManager - drops previous id older than 24 hours', () => {
    const {create, clock} = setup();
    const manager = create();
    manager.getSession();

    clock.now += 24 * 60 * 60 * 1000;
    const session = manager.getSession();
    assert.strictEqual(session.previousId, undefined);
});

test('SessionManager - activity extends the session until max duration', () => {
    const {create, clock} = setup();
    const manager = create();
    const first = manager.getSession();

    // active every 30s for just under 10 minutes
    for (let i = 0; i < 19; i++) {
        clock.now += 30_000;
        assert.strictEqual(manager.getSession().id, first.id);
    }

    clock.now += 30_000;
    assert.notStrictEqual(manager.getSession().id, first.id);
});

test('SessionManager - adopts a session rotated by another tab', () => {
    const {create, sessionStorage} = setup();
    const tabA = create();
    tabA.getSession();

    /** @type {import('../../lib/session.js').SessionState} */
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

test('SessionManager - ignores malformed stored data', () => {
    const {create, sessionStorage} = setup();
    sessionStorage.setItem(SESSION_STORAGE_KEY, '{"id": 42}');
    const id = create().getSessionId();
    assert.match(id, UUID_V4);

    sessionStorage.setItem(SESSION_STORAGE_KEY, 'not json');
    assert.match(create().getSessionId(), UUID_V4);
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
    assert.strictEqual(create().getTabId(), 'existing-tab');
});

test('SessionSampler - uses default ratio if gets incorrect param', () => {
    const badImputs = [NaN, true, 'string', () => null, {}];

    for (const input of badImputs) {
        // @ts-expect-error -- types do not match the constructor
        const sampler = new SessionSampler(input);
        assert.strictEqual(sampler.toString(), 'SessionSampler(ratio=1)');
    }
});

test('SessionSampler - clamps the ratio value if out of bounds', () => {
    const samplerLower = new SessionSampler(-1);
    assert.strictEqual(samplerLower.toString(), 'SessionSampler(ratio=0)');

    const samplerHigher = new SessionSampler(1.5);
    assert.strictEqual(samplerHigher.toString(), 'SessionSampler(ratio=1)');
});

test('SessionSampler - trucated the ratio value up to 4 decimals', () => {
    const sampler = new SessionSampler(0.12354325);
    assert.strictEqual(sampler.toString(), 'SessionSampler(ratio=0.1235)');
});

test('SessionSampler - samples all sessions if ratio is 1', () => {
    const sampler = new SessionSampler(1);

    for (let i = 0; i < 100; i++) {
        const result = sampler.shouldSample(generateUUID());
        assert.strictEqual(
            result.decision,
            SamplingDecision.RECORD,
            'session sampled'
        );
    }
});

test('SessionSampler - samples no sessions if ratio is 0', () => {
    const sampler = new SessionSampler(0);

    for (let i = 0; i < 100; i++) {
        const result = sampler.shouldSample(generateUUID());
        assert.strictEqual(
            result.decision,
            SamplingDecision.NOT_RECORD,
            'session not sampled'
        );
    }
});

test('SessionSampler - samples according to the ratio', () => {
    const ratio = 0.7;
    const sampler = new SessionSampler(ratio);
    let sampledSessions = 0;

    for (let i = 0; i < 100; i++) {
        const result = sampler.shouldSample(generateUUID());
        if (result.decision === SamplingDecision.RECORD) {
            sampledSessions += 1;
        }
    }

    const rate = sampledSessions / 100;
    assert.notStrictEqual(rate, 0, 'does sample sessions');
    assert.notStrictEqual(rate, 1, 'does sample out sessions');
});

test('SessionSpanProcessor - forwards spans to inner processors if session is sampled', () => {
    const id = generateUUID();
    const sampled = true;
    const session = {id, sampled, samplingRate: 1};
    const attrs = {
        'session.id': id,
        'session.sampling_rate': 1,
        'browser.tab.id': generateUUID(),
    };
    const managerMock = {
        getSession: mock.fn(() => session),
        getTabId: mock.fn(() => attrs['browser.tab.id']),
    };
    const processorMock = {
        onStart: mock.fn(() => undefined),
        onEnd: mock.fn(() => undefined),
        forceFlush: mock.fn(() => Promise.resolve()),
        shutdown: mock.fn(() => Promise.resolve()),
    };
    const processor = new SessionSpanProcessor({
        // @ts-expect-error -- using a mock
        manager: managerMock,
        processors: [processorMock],
    });
    const spanMock = {
        attributes: undefined,
        setAttributes: mock.fn((attrs) => {
            spanMock.attributes = attrs;
        }),
    };
    const ctx = {};

    // @ts-expect-error -- we do not need a full span here
    processor.onStart(spanMock, ctx);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(managerMock.getTabId.mock.callCount(), 1);
    assert.strictEqual(spanMock.setAttributes.mock.callCount(), 1);
    assert.deepStrictEqual(spanMock.setAttributes.mock.calls[0].arguments, [
        attrs,
    ]);
    assert.strictEqual(processorMock.onStart.mock.callCount(), 1);
    assert.deepEqual(processorMock.onStart.mock.calls[0].arguments, [
        spanMock,
        ctx,
    ]);

    // @ts-expect-error -- we do not need a full span here
    processor.onEnd(spanMock);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(processorMock.onEnd.mock.callCount(), 1);
    assert.deepEqual(processorMock.onEnd.mock.calls[0].arguments, [spanMock]);

    processor.forceFlush();
    assert.strictEqual(processorMock.forceFlush.mock.callCount(), 1);

    processor.shutdown();
    assert.strictEqual(processorMock.shutdown.mock.callCount(), 1);

    mock.reset();
});

test('SessionSpanProcessor - does not forward spans to inner processors if session is not sampled', () => {
    const id = generateUUID();
    const sampled = false;
    const session = {id, sampled, samplingRate: 0};
    const attrs = {
        'session.id': id,
        'session.sampling_rate': 0,
        'browser.tab.id': generateUUID(),
    };
    const managerMock = {
        getSession: mock.fn(() => session),
        getTabId: mock.fn(() => attrs['browser.tab.id']),
    };
    const processorMock = {
        onStart: mock.fn(() => undefined),
        onEnd: mock.fn(() => undefined),
        forceFlush: mock.fn(() => Promise.resolve()),
        shutdown: mock.fn(() => Promise.resolve()),
    };
    const processor = new SessionSpanProcessor({
        // @ts-expect-error -- using a mock
        manager: managerMock,
        processors: [processorMock],
    });
    const spanMock = {
        setAttributes: mock.fn(() => undefined),
    };
    const ctx = {};

    // @ts-expect-error -- we do not need a full span here
    processor.onStart(spanMock, ctx);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(managerMock.getTabId.mock.callCount(), 0);
    assert.strictEqual(spanMock.setAttributes.mock.callCount(), 0);
    assert.strictEqual(processorMock.onStart.mock.callCount(), 0);

    // @ts-expect-error -- we do not need a full span here
    processor.onEnd(spanMock);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(processorMock.onEnd.mock.callCount(), 0);

    processor.forceFlush();
    assert.strictEqual(processorMock.forceFlush.mock.callCount(), 1);

    processor.shutdown();
    assert.strictEqual(processorMock.shutdown.mock.callCount(), 1);

    mock.reset();
});

test('SessionSpanProcessor - forwards spans that started on a sampled session', () => {
    const id = generateUUID();
    const sampled = true;
    const session = {id, sampled, samplingRate: 0.5};
    const attrs = {
        'session.id': id,
        'session.sampling_rate': 0.5,
        'browser.tab.id': generateUUID(),
    };
    const managerMock = {
        getSession: mock.fn(() => session),
        getTabId: mock.fn(() => attrs['browser.tab.id']),
    };
    const processorMock = {
        onStart: mock.fn(() => undefined),
        onEnd: mock.fn(() => undefined),
        forceFlush: mock.fn(() => Promise.resolve()),
        shutdown: mock.fn(() => Promise.resolve()),
    };
    const processor = new SessionSpanProcessor({
        // @ts-expect-error -- using a mock
        manager: managerMock,
        processors: [processorMock],
    });
    const spanMock = {
        attributes: undefined,
        setAttributes: mock.fn((attrs) => {
            spanMock.attributes = attrs;
        }),
    };
    const ctx = {};

    // Start the span with the sampled session
    // @ts-expect-error -- we do not need a full span here
    processor.onStart(spanMock, ctx);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(managerMock.getTabId.mock.callCount(), 1);
    assert.strictEqual(spanMock.setAttributes.mock.callCount(), 1);
    assert.deepStrictEqual(spanMock.setAttributes.mock.calls[0].arguments, [
        attrs,
    ]);
    assert.strictEqual(processorMock.onStart.mock.callCount(), 1);
    assert.deepEqual(processorMock.onStart.mock.calls[0].arguments, [
        spanMock,
        ctx,
    ]);

    // Change to a new session that isn't sampled
    session.id = generateUUID();
    session.sampled = false;

    // @ts-expect-error -- we do not need a full span here
    processor.onEnd(spanMock);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(processorMock.onEnd.mock.callCount(), 1);
    assert.deepEqual(processorMock.onEnd.mock.calls[0].arguments, [spanMock]);

    processor.forceFlush();
    assert.strictEqual(processorMock.forceFlush.mock.callCount(), 1);

    processor.shutdown();
    assert.strictEqual(processorMock.shutdown.mock.callCount(), 1);

    mock.reset();
});

test('SessionLogRecorsProcessor - forwards log records to inner processors is session is sampled', () => {
    const id = generateUUID();
    const sampled = true;
    const session = {id, sampled, samplingRate: 1};
    const attrs = {
        'session.id': id,
        'session.sampling_rate': 1,
        'browser.tab.id': generateUUID(),
    };
    const managerMock = {
        getSession: mock.fn(() => session),
        getTabId: mock.fn(() => attrs['browser.tab.id']),
    };
    const processorMock = {
        onEmit: mock.fn(() => undefined),
        forceFlush: mock.fn(() => Promise.resolve()),
        shutdown: mock.fn(() => Promise.resolve()),
    };
    const processor = new SessionLogRecordProcessor({
        // @ts-expect-error -- using a mock
        manager: managerMock,
        processors: [processorMock],
    });
    const logRecordMock = {
        setAttributes: mock.fn(() => undefined),
    };
    const ctx = {};

    // @ts-expect-error -- we do not need a full span here
    processor.onEmit(logRecordMock, ctx);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(managerMock.getTabId.mock.callCount(), 1);
    assert.deepStrictEqual(
        logRecordMock.setAttributes.mock.calls[0].arguments,
        [attrs]
    );
    assert.strictEqual(processorMock.onEmit.mock.callCount(), 1);
    assert.deepEqual(processorMock.onEmit.mock.calls[0].arguments, [
        logRecordMock,
        ctx,
    ]);

    processor.forceFlush();
    assert.strictEqual(processorMock.forceFlush.mock.callCount(), 1);

    processor.shutdown();
    assert.strictEqual(processorMock.shutdown.mock.callCount(), 1);

    mock.reset();
});

test('SessionLogRecorsProcessor - does not forward log records to inner processors is session is not sampled', () => {
    const id = generateUUID();
    const sampled = false;
    const session = {id, sampled, samplingRate: 0};
    const attrs = {
        'session.id': id,
        'session.sampling_rate': 0,
        'browser.tab.id': generateUUID(),
    };
    const managerMock = {
        getSession: mock.fn(() => session),
        getTabId: mock.fn(() => attrs['browser.tab.id']),
    };
    const processorMock = {
        onEmit: mock.fn(() => undefined),
        forceFlush: mock.fn(() => Promise.resolve()),
        shutdown: mock.fn(() => Promise.resolve()),
    };
    const processor = new SessionLogRecordProcessor({
        // @ts-expect-error -- using a mock
        manager: managerMock,
        processors: [processorMock],
    });
    const logRecordMock = {
        setAttributes: mock.fn(() => undefined),
    };
    const ctx = {};

    // @ts-expect-error -- we do not need a full span here
    processor.onEmit(logRecordMock, ctx);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(managerMock.getTabId.mock.callCount(), 0);
    assert.strictEqual(processorMock.onEmit.mock.callCount(), 0);

    processor.forceFlush();
    assert.strictEqual(processorMock.forceFlush.mock.callCount(), 1);

    processor.shutdown();
    assert.strictEqual(processorMock.shutdown.mock.callCount(), 1);

    mock.reset();
});
