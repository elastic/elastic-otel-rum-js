/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {diag, DiagLogLevel} from '@opentelemetry/api';

import {
    createUserApi,
    UserLogRecordProcessor,
    UserManager,
    UserSpanProcessor,
} from '../../lib/user.js';

/** Minimal span / log record that records attributes. */
function fakeRecord() {
    /** @type {Record<string, any>} */
    const attributes = {};
    return {
        attributes,
        setAttributes(/** @type {Record<string, any>} */ attrs) {
            Object.assign(attributes, attrs);
        },
    };
}

test('no attributes until a user is set', () => {
    assert.deepEqual(new UserManager().getAttributes(), {});
});

test('setUser stamps id, email, name and account', () => {
    const manager = new UserManager();
    manager.setUser({
        id: 'u-1',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        account: 'acme',
    });
    assert.deepEqual(manager.getAttributes(), {
        'user.id': 'u-1',
        'user.email': 'ada@example.com',
        'user.full_name': 'Ada Lovelace',
        'elastic.user.account': 'acme',
    });
});

test('only id is required, empty or non-string optional fields are dropped', () => {
    const manager = new UserManager();
    manager.setUser({id: 'u-1'});
    assert.deepEqual(manager.getAttributes(), {'user.id': 'u-1'});
    manager.setUser({
        id: 'u-2',
        email: '',
        name: /** @type {any} */ (42),
    });
    assert.deepEqual(manager.getAttributes(), {'user.id': 'u-2'});
});

test('setUser adds custom attributes with a prefix', () => {
    const manager = new UserManager();
    manager.setUser({
        id: 'u-1',
        attributes: {plan: 'premium', seats: 5, beta: false},
    });
    assert.deepEqual(manager.getAttributes(), {
        'user.id': 'u-1',
        'elastic.user.attributes.plan': 'premium',
        'elastic.user.attributes.seats': 5,
        'elastic.user.attributes.beta': false,
    });
});

test('custom attributes with invalid keys or values are dropped', () => {
    const manager = new UserManager();
    manager.setUser({
        id: 'u-1',
        attributes: /** @type {any} */ ({
            '': 'empty key',
            nan: NaN,
            obj: {a: 1},
            list: [1],
            nothing: null,
            ok: 'yes',
        }),
    });
    assert.deepEqual(manager.getAttributes(), {
        'user.id': 'u-1',
        'elastic.user.attributes.ok': 'yes',
    });
    manager.setUser({id: 'u-2', attributes: /** @type {any} */ ('nope')});
    assert.deepEqual(manager.getAttributes(), {'user.id': 'u-2'});
});

test('custom attributes cannot override reserved user attributes', () => {
    const manager = new UserManager();
    manager.setUser({id: 'u-1', attributes: {id: 'other'}});
    assert.deepEqual(manager.getAttributes(), {
        'user.id': 'u-1',
        'elastic.user.attributes.id': 'other',
    });
});

test('setUser replaces the previous identity', () => {
    const manager = new UserManager();
    manager.setUser({id: 'u-1', email: 'a@example.com'});
    manager.setUser({id: 'u-2'});
    assert.deepEqual(manager.getAttributes(), {'user.id': 'u-2'});
});

test('clearUser removes the identity', () => {
    const manager = new UserManager();
    manager.setUser({id: 'u-1'});
    manager.clearUser();
    assert.deepEqual(manager.getAttributes(), {});
});

test('invalid input is ignored with a warning and keeps the current user', () => {
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
        {logLevel: DiagLogLevel.WARN}
    );
    try {
        const manager = new UserManager();
        manager.setUser({id: 'u-1'});
        manager.setUser(/** @type {any} */ ({}));
        manager.setUser({id: ''});
        manager.setUser(/** @type {any} */ ({id: 1}));
        manager.setUser(/** @type {any} */ (null));
        assert.deepEqual(manager.getAttributes(), {'user.id': 'u-1'});
        assert.equal(warnings.length, 4);
    } finally {
        diag.disable();
    }
});

test('processors stamp the identity at start/emit and follow changes', () => {
    const manager = new UserManager();
    const spans = new UserSpanProcessor(manager);
    const logs = new UserLogRecordProcessor(manager);

    const before = fakeRecord();
    spans.onStart(/** @type {any} */ (before));
    assert.deepEqual(before.attributes, {});

    manager.setUser({id: 'u-1'});
    const span = fakeRecord();
    const log = fakeRecord();
    spans.onStart(/** @type {any} */ (span));
    logs.onEmit(log);
    assert.deepEqual(span.attributes, {'user.id': 'u-1'});
    assert.deepEqual(log.attributes, {'user.id': 'u-1'});

    manager.setUser({id: 'u-2', account: 'acme'});
    const changed = fakeRecord();
    logs.onEmit(changed);
    assert.deepEqual(changed.attributes, {
        'user.id': 'u-2',
        'elastic.user.account': 'acme',
    });
    // already stamped records are not rewritten
    assert.deepEqual(span.attributes, {'user.id': 'u-1'});

    manager.clearUser();
    const cleared = fakeRecord();
    spans.onStart(/** @type {any} */ (cleared));
    assert.deepEqual(cleared.attributes, {});
});

test('processors flush and shut down', async () => {
    const manager = new UserManager();
    for (const p of [
        new UserSpanProcessor(manager),
        new UserLogRecordProcessor(manager),
    ]) {
        await p.forceFlush();
        await p.shutdown();
    }
});

test('user api delegates to the manager and is a no-op without one', () => {
    const manager = new UserManager();
    const api = createUserApi(manager);
    api.setUser({id: 'u-1'});
    assert.deepEqual(manager.getAttributes(), {'user.id': 'u-1'});
    api.clearUser();
    assert.deepEqual(manager.getAttributes(), {});

    const noop = createUserApi(undefined);
    assert.doesNotThrow(() => {
        noop.setUser({id: 'u-1'});
        noop.clearUser();
    });
});
