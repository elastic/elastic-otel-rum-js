/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {diag, DiagLogLevel} from '@opentelemetry/api';

import {
    createActionApi,
    MAX_ACTION_ARRAY_LENGTH,
    MAX_ACTION_ATTRIBUTES,
    MAX_ACTION_NAME_LENGTH,
    MAX_ACTION_VALUE_LENGTH,
} from '../../lib/action.js';

const HREF = 'https://example.com/search?q=shoes';

/** @param {{enabled?: () => boolean}} [opts] */
function setup(opts = {}) {
    /** @type {any[]} */
    const emitted = [];
    const logger = {
        emit: (/** @type {any} */ record) => emitted.push(record),
        ...opts,
    };
    const api = createActionApi(/** @type {any} */ (logger), () => HREF);
    return {api, emitted};
}

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

test('addAction emits a log event named after the action', () => {
    const {api, emitted} = setup();
    api.addAction('product.search', {
        'search.query': 'shoes',
        'search.result_count': 12,
        'search.has_filters': false,
    });
    assert.deepEqual(emitted, [
        {
            eventName: 'product.search',
            attributes: {
                'search.query': 'shoes',
                'search.result_count': 12,
                'search.has_filters': false,
                'url.full': HREF,
            },
        },
    ]);
});

test('addAction works without attributes', () => {
    const {api, emitted} = setup();
    api.addAction('checkout.started');
    assert.deepEqual(emitted, [
        {eventName: 'checkout.started', attributes: {'url.full': HREF}},
    ]);
});

test('addAction omits the page URL when it is not available', () => {
    /** @type {any[]} */
    const emitted = [];
    const api = createActionApi(
        /** @type {any} */ ({emit: (/** @type {any} */ r) => emitted.push(r)}),
        () => undefined
    );
    api.addAction('a');
    assert.deepEqual(emitted[0].attributes, {});
});

test('addAction ignores invalid names with a warning', () => {
    const {api, emitted} = setup();
    const warnings = captureWarnings(() => {
        api.addAction('');
        api.addAction(/** @type {any} */ (undefined));
        api.addAction(/** @type {any} */ (42));
        api.addAction('x'.repeat(MAX_ACTION_NAME_LENGTH + 1));
    });
    assert.equal(emitted.length, 0);
    assert.equal(warnings.length, 4);
});

test('addAction ignores names with control characters', () => {
    const {api, emitted} = setup();
    const warnings = captureWarnings(() => {
        api.addAction('a\nb');
        api.addAction('a\u0000b');
        api.addAction('a\tb');
    });
    assert.equal(emitted.length, 0);
    assert.equal(warnings.length, 3);
});

test('addAction accepts names with punctuation and non-ASCII characters', () => {
    const {api, emitted} = setup();
    for (const name of ['checkout:step-2', 'búsqueda', 'a b', '検索']) {
        api.addAction(name);
    }
    assert.equal(emitted.length, 4);
});

test('addAction keeps a name of the maximum length', () => {
    const {api, emitted} = setup();
    const name = 'x'.repeat(MAX_ACTION_NAME_LENGTH);
    api.addAction(name);
    assert.equal(emitted[0].eventName, name);
});

test('addAction drops invalid attribute values and warns by key only', () => {
    const {api, emitted} = setup();
    const warnings = captureWarnings(() => {
        api.addAction('a', {
            ok: 'yes',
            empty: '',
            nan: NaN,
            inf: Infinity,
            obj: /** @type {any} */ ({secret: 'ada@example.com'}),
            nil: /** @type {any} */ (null),
            undef: /** @type {any} */ (undefined),
        });
    });
    assert.deepEqual(emitted[0].attributes, {ok: 'yes', 'url.full': HREF});
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /empty, nan, inf, obj, nil, undef/);
    assert.doesNotMatch(warnings[0], /ada@example.com/);
});

test('addAction ignores attributes that are not a plain object', () => {
    const {api, emitted} = setup();
    const warnings = captureWarnings(() => {
        api.addAction('a', /** @type {any} */ ('str'));
        api.addAction('b', /** @type {any} */ (['x']));
        api.addAction('c', /** @type {any} */ (null));
    });
    assert.deepEqual(
        emitted.map((e) => e.eventName),
        ['a', 'b', 'c']
    );
    for (const e of emitted) {
        assert.deepEqual(e.attributes, {'url.full': HREF});
    }
    assert.equal(warnings.length, 2);
});

test('addAction caps the number of attributes', () => {
    const {api, emitted} = setup();
    /** @type {Record<string, number>} */
    const attrs = {};
    for (let i = 0; i < MAX_ACTION_ATTRIBUTES + 5; i++) {
        attrs[`k${i}`] = i;
    }
    const warnings = captureWarnings(() => api.addAction('a', attrs));
    const keys = Object.keys(emitted[0].attributes).filter(
        (k) => k !== 'url.full'
    );
    assert.equal(keys.length, MAX_ACTION_ATTRIBUTES);
    assert.ok(keys.includes('k0'));
    assert.ok(!keys.includes(`k${MAX_ACTION_ATTRIBUTES}`));
    assert.equal(warnings.length, 1);
});

test('addAction truncates long string values', () => {
    const {api, emitted} = setup();
    api.addAction('a', {q: 'x'.repeat(MAX_ACTION_VALUE_LENGTH + 10)});
    assert.equal(emitted[0].attributes.q.length, MAX_ACTION_VALUE_LENGTH);
});

test('addAction accepts homogeneous arrays of primitives', () => {
    const {api, emitted} = setup();
    api.addAction('a', {
        ids: ['p-1', 'p-2'],
        prices: [1.5, 2],
        flags: [true, false],
    });
    const {attributes} = emitted[0];
    assert.deepEqual(attributes.ids, ['p-1', 'p-2']);
    assert.deepEqual(attributes.prices, [1.5, 2]);
    assert.deepEqual(attributes.flags, [true, false]);
});

test('addAction drops invalid arrays', () => {
    const {api, emitted} = setup();
    const warnings = captureWarnings(() =>
        api.addAction('a', {
            ok: ['x'],
            empty: [],
            mixed: /** @type {any} */ (['x', 1]),
            nested: /** @type {any} */ ([['x']]),
            objects: /** @type {any} */ ([{a: 1}]),
            nan: [NaN],
            blank: [''],
        })
    );
    assert.deepEqual(emitted[0].attributes, {ok: ['x'], 'url.full': HREF});
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /empty, mixed, nested, objects, nan, blank/);
});

test('addAction caps array length and truncates array strings', () => {
    const {api, emitted} = setup();
    api.addAction('a', {
        many: Array.from({length: MAX_ACTION_ARRAY_LENGTH + 5}, (_, i) => i),
        long: ['x'.repeat(MAX_ACTION_VALUE_LENGTH + 10)],
    });
    assert.equal(emitted[0].attributes.many.length, MAX_ACTION_ARRAY_LENGTH);
    assert.equal(emitted[0].attributes.long[0].length, MAX_ACTION_VALUE_LENGTH);
});

test('addAction does not hold on to the given arrays', () => {
    const {api, emitted} = setup();
    const ids = ['p-1'];
    api.addAction('a', {ids});
    ids.push('p-2');
    assert.deepEqual(emitted[0].attributes.ids, ['p-1']);
});

test('addAction reserved namespaces are case-insensitive', () => {
    const {api, emitted} = setup();
    captureWarnings(() =>
        api.addAction('a', {
            'ELASTIC.user.account': 'x',
            'Session.id': 'x',
            'User.id': 'x',
            'URL.full': 'x',
            'Event.name': 'x',
            ok: 'y',
        })
    );
    assert.deepEqual(emitted[0].attributes, {ok: 'y', 'url.full': HREF});
});

test('addAction rejects attributes in reserved namespaces', () => {
    const {api, emitted} = setup();
    const warnings = captureWarnings(() =>
        api.addAction('a', {
            'session.id': 'spoofed',
            'user.id': 'spoofed',
            'url.full': 'https://evil.example',
            'url.template': '/spoofed',
            'elastic.user.account': 'spoofed',
            'event.name': 'spoofed',
            'search.query': 'shoes',
        })
    );
    assert.deepEqual(emitted[0].attributes, {
        'search.query': 'shoes',
        'url.full': HREF,
    });
    assert.equal(warnings.length, 1);
});

test('addAction does not mutate the given attributes', () => {
    const {api} = setup();
    const attrs = Object.freeze({q: 'shoes'});
    assert.doesNotThrow(() => api.addAction('a', attrs));
    assert.deepEqual(attrs, {q: 'shoes'});
});

test('addAction skips the event when the logger is disabled', () => {
    const {api, emitted} = setup({enabled: () => false});
    api.addAction('a');
    assert.equal(emitted.length, 0);
});

test('addAction never throws if the logger fails', () => {
    const logger = {
        emit() {
            throw new Error('boom');
        },
    };
    const api = createActionApi(/** @type {any} */ (logger), () => HREF);
    const warnings = captureWarnings(() => {
        assert.doesNotThrow(() => api.addAction('a'));
    });
    assert.equal(warnings.length, 1);
});

test('action api is a no-op without a logger', () => {
    const api = createActionApi(undefined);
    assert.doesNotThrow(() => api.addAction('a', {b: 1}));
});
