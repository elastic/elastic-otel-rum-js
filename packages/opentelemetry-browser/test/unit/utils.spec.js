/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {appendPath, isValidArray, resolveExportUrls} from '../../lib/utils.js';

test('isValidArray - returns true when every item passes the validator', () => {
    const isString = (/** @type {unknown} */ i) => typeof i === 'string';
    assert.strictEqual(isValidArray(['a', 'b'], isString), true);
    assert.strictEqual(isValidArray([], isString), true);
});

test('isValidArray - returns false when any item fails the validator', () => {
    const isString = (/** @type {unknown} */ i) => typeof i === 'string';
    assert.strictEqual(isValidArray(['a', 1], isString), false);
});

test('isValidArray - returns false for non-array values', () => {
    const always = () => true;
    assert.strictEqual(isValidArray(null, always), false);
    assert.strictEqual(isValidArray(undefined, always), false);
    assert.strictEqual(isValidArray('not-an-array', always), false);
    assert.strictEqual(isValidArray({}, always), false);
});

test('appendPath - appends path segments to the URL pathname', () => {
    const base = new URL('https://example.com/api/');
    const result = appendPath(base, 'v1/traces');
    assert.strictEqual(result.href, 'https://example.com/api/v1/traces');
    assert.strictEqual(base.pathname, '/api/');
});

test('appendPath - avoids a double slash when path starts with /', () => {
    const base = new URL('https://example.com/api/');
    const result = appendPath(base, '/v1/logs');
    assert.strictEqual(result.href, 'https://example.com/api/v1/logs');
});

test('appendPath - works when base pathname has no trailing slash', () => {
    const base = new URL('https://example.com/api');
    const result = appendPath(base, '/v1/metrics');
    assert.strictEqual(result.href, 'https://example.com/api/v1/metrics');
});

test('appendPath - adds the separator when neither side has a slash', () => {
    const base = new URL('https://example.com/docs/_api');
    const result = appendPath(base, 'v1/traces');
    assert.strictEqual(result.href, 'https://example.com/docs/_api/v1/traces');
});

test('appendPath - joins with a single slash when both sides have one', () => {
    const base = new URL('https://example.com/api/');
    const result = appendPath(base, '/v1/logs');
    assert.strictEqual(result.href, 'https://example.com/api/v1/logs');
});

test('appendPath - works when the base is the origin only', () => {
    const base = new URL('https://example.com');
    const result = appendPath(base, 'v1/metrics');
    assert.strictEqual(result.href, 'https://example.com/v1/metrics');
});

test('appendPath - preserves origin, search, and hash', () => {
    const base = new URL('https://example.com:8443/base/?q=1#frag');
    const result = appendPath(base, 'v1/traces');
    assert.strictEqual(result.origin, 'https://example.com:8443');
    assert.strictEqual(result.pathname, '/base/v1/traces');
    assert.strictEqual(result.search, '?q=1');
    assert.strictEqual(result.hash, '#frag');
});

test('resolveExportUrls - appends the signal paths to the base url', () => {
    assert.deepStrictEqual(
        resolveExportUrls({url: 'https://example.com/api/'}),
        {
            tracesUrl: 'https://example.com/api/v1/traces',
            logsUrl: 'https://example.com/api/v1/logs',
        }
    );
});

test('resolveExportUrls - uses a per-signal url as is', () => {
    let urls = resolveExportUrls({
        url: 'https://example.com/api/',
        tracesUrl: 'https://example.com/custom/t',
        logsUrl: '/custom/l?x=1'.replace(/^/, 'https://example.com'),
    });
    assert.strictEqual(urls.tracesUrl, 'https://example.com/custom/t');
    assert.strictEqual(urls.logsUrl, 'https://example.com/custom/l?x=1');

    // signals without an override still derive from the base url
    urls = resolveExportUrls({
        url: 'https://example.com/api/',
        tracesUrl: 'https://example.com/custom/t',
    });
    assert.strictEqual(urls.tracesUrl, 'https://example.com/custom/t');
    assert.strictEqual(urls.logsUrl, 'https://example.com/api/v1/logs');
});

test('resolveExportUrls - does not need a base url when every signal has its own', () => {
    assert.deepStrictEqual(
        resolveExportUrls({
            tracesUrl: 'https://example.com/t',
            logsUrl: 'https://example.com/l',
        }),
        {
            tracesUrl: 'https://example.com/t',
            logsUrl: 'https://example.com/l',
        }
    );
});

test('resolveExportUrls - throws naming the invalid option', () => {
    assert.throws(
        () => resolveExportUrls({url: 'not a url'}),
        /"not a url" for "exportConfig.url" configuration is not an URL/
    );
    assert.throws(
        () =>
            resolveExportUrls({
                url: 'https://example.com/',
                logsUrl: '/relative/l',
            }),
        /"\/relative\/l" for "exportConfig.logsUrl" configuration is not an URL/
    );
    assert.throws(() => resolveExportUrls({}), /exportConfig.url/);
});
