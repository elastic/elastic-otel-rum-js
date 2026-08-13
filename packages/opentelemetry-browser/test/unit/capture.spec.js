/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {afterEach, test} from 'node:test';

import {
    clearLastUserAction,
    configFromScriptDataset,
    configureCapture,
    getLastUserAction,
    groupUrlPath,
    isPaused,
    looksLikeId,
    matchesIgnoreUrl,
    parseGraphqlOperation,
    pauseCapture,
    resumeCapture,
    serializeRejection,
    setLastUserAction,
} from '../../lib/capture.js';

afterEach(() => {
    configureCapture({});
    resumeCapture();
    clearLastUserAction();
});

test('looksLikeId detects uuids and long numbers', () => {
    assert.equal(looksLikeId('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.equal(looksLikeId('12345'), true);
    assert.equal(looksLikeId('abcdef0123456789'), true);
    assert.equal(looksLikeId('cart'), false);
});

test('groupUrlPath replaces ids and truncates at depth', () => {
    assert.equal(
        groupUrlPath('/user/550e8400-e29b-41d4-a716-446655440000/orders', {
            depth: 8,
        }),
        '/user/:id/orders'
    );
    assert.equal(
        groupUrlPath('/a/b/c/d/e', {depth: 3}),
        '/a/b/c/*'
    );
});

test('groupUrlPath applies glob rules first', () => {
    assert.equal(
        groupUrlPath('/user/99/settings', {rules: ['/user/*']}),
        '/user/*/settings'
    );
});

test('matchesIgnoreUrl uses substring and regex', () => {
    configureCapture({ignoreUrls: ['/health', /\/metrics$/]});
    assert.equal(matchesIgnoreUrl('https://app.example/healthz'), true);
    assert.equal(matchesIgnoreUrl('https://app.example/v1/metrics'), true);
    assert.equal(matchesIgnoreUrl('https://app.example/cart'), false);
});

test('serializeRejection handles non-Error objects', () => {
    assert.equal(serializeRejection({message: 'nope'}), 'nope');
    assert.equal(serializeRejection({foo: 1}), '{"foo":1}');
    assert.equal(serializeRejection('boom'), 'boom');
});

test('parseGraphqlOperation reads query name when enabled', () => {
    configureCapture({graphql: true});
    assert.deepEqual(
        parseGraphqlOperation(
            '{"query":"query GetCart { cart { id } }","operationName":"GetCart"}'
        ),
        {type: 'query', name: 'GetCart'}
    );
    configureCapture({graphql: false});
    assert.equal(
        parseGraphqlOperation('{"query":"query GetCart { cart { id } }"}'),
        null
    );
});

test('setLastUserAction round-trips', () => {
    setLastUserAction('#checkout', 'button#checkout');
    assert.deepEqual(getLastUserAction(), {
        id: '#checkout',
        name: 'button#checkout',
    });
});

test('pauseCapture is a boolean flag', () => {
    pauseCapture();
    assert.equal(isPaused(), true);
    resumeCapture();
    assert.equal(isPaused(), false);
});

test('configFromScriptDataset maps data attributes', () => {
    const cfg = configFromScriptDataset({
        otlpEndpoint: 'http://localhost:4318',
        serviceName: 'shop',
        sampleRate: '50',
        replayEnabled: 'true',
        ignoreUrls: '/health,/metrics',
        urlGroupingDepth: '3',
        graphql: 'true',
    });
    assert.equal(cfg.otlpEndpoint, 'http://localhost:4318');
    assert.equal(cfg.serviceName, 'shop');
    assert.equal(cfg.sampleRate, 0.5);
    assert.deepEqual(cfg.replay, {enabled: true});
    assert.deepEqual(cfg.capture.ignoreUrls, ['/health', '/metrics']);
    assert.equal(cfg.capture.urlGrouping.depth, 3);
    assert.equal(cfg.capture.graphql, true);
});
