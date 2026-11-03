/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {createSessionApi} from '../../lib/session/api.js';
import {setup} from './session-utils.js';

test('createSessionApi - exposes the current session without internals', () => {
    const {createStarted} = setup();
    const manager = createStarted();
    const api = createSessionApi(manager);

    const session = api.getSession();
    assert.deepStrictEqual(Object.keys(session ?? {}).sort(), [
        'id',
        'previousId',
        'sampled',
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
        'sampled',
        'startTimestamp',
    ]);
    assert.strictEqual(previous.id, /** @type {any} */ (ended[0]).id);
});

test('createSessionApi - is a no-op without a session manager', () => {
    const api = createSessionApi(undefined);
    assert.strictEqual(api.getSession(), undefined);
    assert.doesNotThrow(() => api.addObserver({})());
});
