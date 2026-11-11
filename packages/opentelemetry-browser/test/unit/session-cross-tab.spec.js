/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {shouldSyncSessionFromStorage} from '../../lib/session/cross-tab.js';
/** @param {Partial<import('../../lib/session/state.js').SessionState>} [overrides] */
function session(overrides = {}) {
    return {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        startTimestamp: 0,
        lastActivityTimestamp: 0,
        sampled: true,
        samplingRate: 1,
        ...overrides,
    };
}

test('shouldSyncSessionFromStorage - ends the announced session in another tab', () => {
    const announced = session();
    const stored = {...announced, ended: true};
    assert.strictEqual(shouldSyncSessionFromStorage(stored, announced), true);
});

test('shouldSyncSessionFromStorage - adopts a session rotated by another tab', () => {
    const announced = session();
    const stored = session({id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'});
    assert.strictEqual(shouldSyncSessionFromStorage(stored, announced), true);
});

test('shouldSyncSessionFromStorage - ignores cross-tab activity extension', () => {
    const announced = session({lastActivityTimestamp: 0});
    const stored = {...announced, lastActivityTimestamp: 60_000};
    assert.strictEqual(shouldSyncSessionFromStorage(stored, announced), false);
});

test('shouldSyncSessionFromStorage - ignores a removed session when idle', () => {
    const announced = session();
    assert.strictEqual(
        shouldSyncSessionFromStorage(undefined, announced),
        true
    );
});
