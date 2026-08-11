/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {afterEach, beforeEach, test} from 'node:test';

import {
    checkRotation,
    closeSession,
    getSessionId,
    initSession,
} from '../../lib/session.js';

function installBrowserMocks() {
    const store = new Map();
    globalThis.sessionStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
    };
    globalThis.window = {
        addEventListener() {},
        removeEventListener() {},
    };
    globalThis.document = {cookie: ''};
    globalThis.location = {protocol: 'http:'};
    globalThis.BroadcastChannel = class {
        postMessage() {}
        close() {}
        set onmessage(_fn) {}
    };
    return store;
}

beforeEach(() => {
    closeSession();
    installBrowserMocks();
});

afterEach(() => {
    closeSession();
});

test('initSession returns a UUID-shaped id and getSessionId matches', () => {
    const id = initSession();
    assert.equal(typeof id, 'string');
    assert.match(
        id,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    assert.equal(getSessionId(), id);
});

test('initSession is idempotent', () => {
    const a = initSession();
    const b = initSession();
    assert.equal(a, b);
});

test('initSession reuses sessionStorage value', () => {
    sessionStorage.setItem('elastic.rum.sid', 'stored-session-id');
    const id = initSession();
    assert.equal(id, 'stored-session-id');
});

test('checkRotation returns false when within max and idle windows', () => {
    initSession();
    const rotated = checkRotation({maxMs: 60_000, idleMs: 60_000});
    assert.equal(rotated, false);
    assert.ok(getSessionId());
});

test('checkRotation rotates when maxMs exceeded', () => {
    const id = initSession();
    // Force elapsed by calling with maxMs: 0
    const rotated = checkRotation({maxMs: 0, idleMs: 60_000});
    assert.equal(rotated, true);
    assert.notEqual(getSessionId(), id);
});

test('closeSession clears id', () => {
    initSession();
    closeSession();
    assert.equal(getSessionId(), null);
});
