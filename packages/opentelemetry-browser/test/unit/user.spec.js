/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {diag, DiagLogLevel} from '@opentelemetry/api';

import {
    createUserApi,
    MAX_USER_ATTRIBUTES,
    MAX_USER_VALUE_LENGTH,
    UserLogRecordProcessor,
    UserManager,
    UserSpanProcessor,
} from '../../lib/user.js';

/** Captures `diag.warn` calls while `fn` runs. */
function captureWarnings(/** @type {() => void} */ fn) {
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
        fn();
    } finally {
        diag.disable();
    }
    return warnings;
}

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

test('setUser warns about ignored fields by key only', () => {
    const manager = new UserManager();
    const warnings = captureWarnings(() =>
        manager.setUser({
            id: 'u-1',
            email: /** @type {any} */ (null),
            name: /** @type {any} */ (42),
            attributes: /** @type {any} */ ({plan: [], secret: {a: 1}}),
        })
    );
    assert.deepEqual(manager.getAttributes(), {'user.id': 'u-1'});
    assert.equal(warnings.length, 1);
    assert.match(
        warnings[0],
        /email, name, attributes\.plan, attributes\.secret/
    );
    assert.doesNotMatch(warnings[0], /\[object/);

    const nonObject = captureWarnings(() =>
        manager.setUser({id: 'u-1', attributes: /** @type {any} */ ([1])})
    );
    assert.match(nonObject[0], /attributes$/);

    assert.deepEqual(
        captureWarnings(() => manager.setUser({id: 'u-1', email: 'a@b.co'})),
        []
    );
});

test('empty custom string values are dropped like empty fixed fields', () => {
    const manager = new UserManager();
    captureWarnings(() =>
        manager.setUser({id: 'u-1', email: '', attributes: {plan: ''}})
    );
    assert.deepEqual(manager.getAttributes(), {'user.id': 'u-1'});
});

test('custom attributes are capped and long values truncated', () => {
    const manager = new UserManager();
    /** @type {Record<string, string>} */
    const custom = {};
    for (let i = 0; i < MAX_USER_ATTRIBUTES + 5; i++) {
        custom[`k${i}`] = 'v';
    }
    const long = 'x'.repeat(MAX_USER_VALUE_LENGTH + 10);
    const warnings = captureWarnings(() =>
        manager.setUser({id: long, email: long, attributes: custom})
    );
    const attrs = manager.getAttributes();
    const customKeys = Object.keys(attrs).filter((k) =>
        k.startsWith('elastic.user.attributes.')
    );
    assert.equal(customKeys.length, MAX_USER_ATTRIBUTES);
    assert.equal(attrs['elastic.user.attributes.k0'], 'v');
    assert.equal(attrs['elastic.user.attributes.k20'], undefined);
    assert.equal(attrs['user.email'], 'x'.repeat(MAX_USER_VALUE_LENGTH));
    // ids are kept whole so distinct users can't collapse into one
    assert.equal(attrs['user.id'], long);
    assert.match(warnings[0], /attributes\.k20/);
});

test('attributes handed to processors cannot be mutated', () => {
    const manager = new UserManager();
    assert.ok(Object.isFrozen(manager.getAttributes()));
    manager.setUser({id: 'u-1'});
    assert.ok(Object.isFrozen(manager.getAttributes()));
});
