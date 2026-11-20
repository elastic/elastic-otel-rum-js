/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {
    getOrCreateTabId,
    SESSION_STORAGE_KEY,
    SessionStore,
    TAB_STORAGE_KEY,
} from '../../lib/session/storage.js';
import {MemoryStorage, UUID_V4} from './session-utils.js';

/** @returns {import('../../lib/session/state.js').SessionState} */
const session = (id = 'a') => ({
    id,
    startTimestamp: 1,
    lastActivityTimestamp: 2,
    sampled: true,
    samplingRate: 1,
});

test('SessionStore - returns undefined when nothing is stored', () => {
    assert.strictEqual(new SessionStore(new MemoryStorage()).get(), undefined);
});

test('SessionStore - saves the session as JSON and reads it back', () => {
    const storage = new MemoryStorage();
    const store = new SessionStore(storage);
    store.save(session());
    assert.deepStrictEqual(
        JSON.parse(storage.getItem(SESSION_STORAGE_KEY) ?? ''),
        session()
    );
    assert.deepStrictEqual(store.get(), {...session(), previousId: undefined});
});

test('SessionStore - picks up a session written by another tab', () => {
    const storage = new MemoryStorage();
    const store = new SessionStore(storage);
    store.save(session('a'));
    new SessionStore(storage).save(session('b'));
    assert.strictEqual(store.get()?.id, 'b');
});

test('SessionStore - ignores malformed and incomplete data', () => {
    const storage = new MemoryStorage();
    const store = new SessionStore(storage);
    for (const raw of [
        '{',
        'null',
        '"a"',
        JSON.stringify({...session(), sampled: 'yes'}),
        JSON.stringify({id: 'a', startTimestamp: 1}),
    ]) {
        storage.setItem(SESSION_STORAGE_KEY, raw);
        assert.strictEqual(store.get(), undefined, raw);
    }
});

test('SessionStore - drops a previous id that is not a string', () => {
    const storage = new MemoryStorage();
    storage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({...session(), previousId: 42})
    );
    assert.strictEqual(new SessionStore(storage).get()?.previousId, undefined);
});

test('SessionStore - keeps the session in memory once a write fails', () => {
    const storage = new MemoryStorage();
    const store = new SessionStore(storage);
    store.save(session('a'));
    storage.failWrites = true;
    store.save(session('b'));
    assert.strictEqual(store.get()?.id, 'b');

    // Storage is no longer read, so the stale value can't win
    storage.failWrites = false;
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session('c')));
    assert.strictEqual(store.get()?.id, 'b');
});

test('getOrCreateTabId - creates and stores an id once', () => {
    const storage = new MemoryStorage();
    const id = getOrCreateTabId(storage);
    assert.match(id, UUID_V4);
    assert.strictEqual(storage.getItem(TAB_STORAGE_KEY), id);
    assert.strictEqual(getOrCreateTabId(storage), id);
});

test('getOrCreateTabId - returns an id when storage throws', () => {
    const storage = new MemoryStorage();
    storage.failWrites = true;
    storage.getItem = () => {
        throw new Error('SecurityError');
    };
    assert.match(getOrCreateTabId(storage), UUID_V4);
});

test('SessionStore - keeps the ended flag only when set', () => {
    const storage = new MemoryStorage();
    const store = new SessionStore(storage);
    store.save({...session(), ended: true});
    assert.strictEqual(new SessionStore(storage).get()?.ended, true);

    storage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({...session(), ended: 'yes'})
    );
    assert.strictEqual(store.get()?.ended, undefined);
});
