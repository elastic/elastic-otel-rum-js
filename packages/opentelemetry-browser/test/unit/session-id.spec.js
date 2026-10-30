/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {generateUUID} from '../../lib/session/id.js';
import {UUID_V4} from './session-utils.js';

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
