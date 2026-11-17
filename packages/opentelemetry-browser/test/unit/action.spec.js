/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {afterEach, beforeEach, test} from 'node:test';

import {diag, DiagLogLevel} from '@opentelemetry/api';

import {
    createActionApi,
    MAX_ACTION_ITEMS,
    MAX_ACTION_NAME_LENGTH,
    MAX_ACTION_VALUE_LENGTH,
} from '../../lib/action.js';

const HREF = 'https://example.com/search?q=shoes';

beforeEach(() => {
    globalThis.location = /** @type {any} */ ({href: HREF});
});
afterEach(() => {
    delete (/** @type {any} */ (globalThis).location);
});

/** @param {{enabled?: () => boolean}} [opts] */
function setup(opts = {}) {
    /** @type {any[]} */
    const emitted = [];
    const logger = {
        emit: (/** @type {any} */ record) => emitted.push(record),
        ...opts,
    };
    return {api: createActionApi(/** @type {any} */ (logger)), emitted};
}

/** Runs `fn` and returns the `diag.warn` messages. */
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

test('addAction emits a log event named after the action', () => {
    const {api, emitted} = setup();
    api.addAction('product.search', {
        'search.query': 'shoes',
        'search.result_count': 12,
        'search.has_filters': false,
        ids: ['p-1', 'p-2'],
    });
    api.addAction('checkout.started');
    assert.deepEqual(emitted, [
        {
            eventName: 'product.search',
            attributes: {
                'search.query': 'shoes',
                'search.result_count': 12,
                'search.has_filters': false,
                ids: ['p-1', 'p-2'],
                'url.full': HREF,
            },
        },
        {eventName: 'checkout.started', attributes: {'url.full': HREF}},
    ]);
});

test('addAction omits the page URL when there is no location', () => {
    delete (/** @type {any} */ (globalThis).location);
    const {api, emitted} = setup();
    api.addAction('a');
    assert.deepEqual(emitted[0].attributes, {});
});

test('addAction validates names', () => {
    const {api, emitted} = setup();
    const valid = ['checkout:step-2', 'búsqueda', 'a'.repeat(128)];
    const invalid = [
        '',
        undefined,
        42,
        'a'.repeat(MAX_ACTION_NAME_LENGTH + 1),
        'a\nb',
        'a\u0000b',
    ];
    const warnings = captureWarnings(() => {
        for (const name of [...valid, ...invalid]) {
            api.addAction(/** @type {any} */ (name));
        }
    });
    assert.deepEqual(
        emitted.map((e) => e.eventName),
        valid
    );
    assert.equal(warnings.length, invalid.length);
});

test('addAction drops invalid values and warns by key only', () => {
    const {api, emitted} = setup();
    const warnings = captureWarnings(() =>
        api.addAction('a', {
            ok: 'yes',
            nan: NaN,
            inf: Infinity,
            obj: /** @type {any} */ ({secret: 'ada@example.com'}),
            nil: /** @type {any} */ (null),
            undef: /** @type {any} */ (undefined),
            mixed: /** @type {any} */ (['x', 1]),
            nested: /** @type {any} */ ([['x']]),
            badItem: [NaN],
            '': 'no key',
        })
    );
    assert.deepEqual(emitted[0].attributes, {ok: 'yes', 'url.full': HREF});
    assert.equal(warnings.length, 1);
    assert.match(
        warnings[0],
        /nan, inf, obj, nil, undef, mixed, nested, badItem, $/
    );
    assert.doesNotMatch(warnings[0], /ada@example.com/);
});

test('addAction ignores attributes that are not a plain object', () => {
    const {api, emitted} = setup();
    const warnings = captureWarnings(() => {
        api.addAction('a', /** @type {any} */ ('str'));
        api.addAction('b', /** @type {any} */ (['x']));
        api.addAction('c', /** @type {any} */ (null));
    });
    assert.equal(emitted.length, 3);
    assert.equal(warnings.length, 2);
});

test('addAction enforces limits', () => {
    const {api, emitted} = setup();
    /** @type {Record<string, number>} */
    const many = {};
    for (let i = 0; i < MAX_ACTION_ITEMS + 5; i++) {
        many[`k${i}`] = i;
    }
    const warnings = captureWarnings(() => api.addAction('a', many));
    const keys = Object.keys(emitted[0].attributes).filter(
        (k) => k !== 'url.full'
    );
    assert.equal(keys.length, MAX_ACTION_ITEMS);
    assert.ok(!keys.includes(`k${MAX_ACTION_ITEMS}`));
    assert.equal(warnings.length, 1);

    api.addAction('b', {
        long: 'x'.repeat(MAX_ACTION_VALUE_LENGTH + 10),
        longItems: ['x'.repeat(MAX_ACTION_VALUE_LENGTH + 10)],
        items: Array.from({length: MAX_ACTION_ITEMS + 5}, (_, i) => i),
    });
    const {attributes} = emitted[1];
    assert.equal(attributes.long.length, MAX_ACTION_VALUE_LENGTH);
    assert.equal(attributes.longItems[0].length, MAX_ACTION_VALUE_LENGTH);
    assert.equal(attributes.items.length, MAX_ACTION_ITEMS);
});

test('addAction ignores reserved namespaces in any letter case', () => {
    const {api, emitted} = setup();
    const warnings = captureWarnings(() =>
        api.addAction('a', {
            'session.id': 'x',
            'user.id': 'x',
            'url.template': 'x',
            'url.full': 'x',
            'elastic.user.account': 'x',
            'event.name': 'x',
            'ELASTIC.x': 'x',
            'Session.id': 'x',
            ok: 'y',
        })
    );
    assert.deepEqual(emitted[0].attributes, {ok: 'y', 'url.full': HREF});
    assert.equal(warnings.length, 1);
});

test('addAction does not modify or keep the given attributes', () => {
    const {api, emitted} = setup();
    const ids = ['p-1'];
    const attrs = Object.freeze({ids});
    api.addAction('a', attrs);
    ids.push('p-2');
    assert.deepEqual(emitted[0].attributes.ids, ['p-1']);
});

test('addAction skips the event when the logger is disabled', () => {
    const {api, emitted} = setup({enabled: () => false});
    api.addAction('a');
    assert.equal(emitted.length, 0);
});

test('action api is a no-op without a logger', () => {
    const api = createActionApi(undefined);
    assert.doesNotThrow(() => api.addAction('a', {b: 1}));
});
