/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {afterEach, test} from 'node:test';

import {
    clearUser,
    getUser,
    getUserAttributes,
    setUser,
} from '../../lib/user.js';

afterEach(() => {
    clearUser();
});

test('setUser requires a non-empty id', () => {
    setUser(/** @type {any} */ ({}));
    assert.equal(getUser(), null);
    setUser({id: ''});
    assert.equal(getUser(), null);
});

test('setUser stamps id/email/name attributes', () => {
    setUser({id: 'u-1', email: 'a@b.co', name: 'Ada'});
    assert.deepEqual(getUserAttributes(), {
        'user.id': 'u-1',
        'user.email': 'a@b.co',
        'user.name': 'Ada',
    });
});

test('clearUser drops attributes', () => {
    setUser({id: 'u-1'});
    clearUser();
    assert.deepEqual(getUserAttributes(), {});
});
