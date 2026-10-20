/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {
    generateUUID,
    resolveSessionTimeouts,
    SESSION_STORAGE_KEY,
    SessionManager,
    TAB_STORAGE_KEY,
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
    const create = (/** @type {MemoryStorage} */ tab = tabStorage) =>
        new SessionManager({
            sessionStorage,
            tabStorage: tab,
            inactivityTimeout: 60,
            maxDuration: 600,
            onSessionStart: (s) => started.push(s),
            now: () => clock.now,
            ...opts,
        });
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

test('SessionManager - creates and persists a session', () => {
    const {create, started, sessionStorage} = setup();
    const manager = create();

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
    assert.strictEqual(
        manager.getAttributes()['session.previous_id'],
        first.id
    );
    assert.strictEqual(started.length, 2);
});

test('SessionManager - drops previous id older than 24 hours', () => {
    const {create, clock} = setup();
    const manager = create();
    manager.getSession();

    clock.now += 24 * 60 * 60 * 1000;
    const session = manager.getSession();
    assert.strictEqual(session.previousId, undefined);
    assert.strictEqual(
        manager.getAttributes()['session.previous_id'],
        undefined
    );
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

    const rotated = {
        id: generateUUID(),
        startTimestamp: 1_000_000,
        lastActivityTimestamp: 1_000_000,
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
    assert.strictEqual(
        create().getAttributes()['browser.tab.id'],
        'existing-tab'
    );
});
