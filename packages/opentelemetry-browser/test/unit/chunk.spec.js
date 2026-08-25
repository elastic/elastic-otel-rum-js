/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {splitUtf8} from '../../lib/chunk.js';

test('splitUtf8 returns the original string when under the budget', () => {
    assert.deepEqual(splitUtf8('hello', 10), ['hello']);
});

test('splitUtf8 splits on the byte budget', () => {
    const parts = splitUtf8('abcdefghij', 4);
    assert.equal(parts.join(''), 'abcdefghij');
    assert.ok(parts.length >= 3);
    for (const part of parts) {
        assert.ok(new TextEncoder().encode(part).length <= 4);
    }
});

test('splitUtf8 does not split a multi-byte character', () => {
    // each euro sign is 3 bytes in UTF-8
    const parts = splitUtf8('€€€', 4);
    assert.equal(parts.join(''), '€€€');
    for (const part of parts) {
        assert.ok(new TextEncoder().encode(part).length <= 4);
        assert.equal([...part].length, 1);
    }
});
