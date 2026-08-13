/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {countRageBursts} from '../../lib/frustration.js';

test('countRageBursts is 0 below the 3-click threshold', () => {
    const clicks = [
        {xpath: '/btn', ts: 0},
        {xpath: '/btn', ts: 200},
    ];
    assert.equal(countRageBursts(clicks), 0);
});

test('countRageBursts counts one burst of 3 clicks in 1s', () => {
    const clicks = [
        {xpath: '/btn', ts: 0},
        {xpath: '/btn', ts: 400},
        {xpath: '/btn', ts: 800},
    ];
    assert.equal(countRageBursts(clicks), 1);
});

test('countRageBursts does not count clicks on different targets', () => {
    const clicks = [
        {xpath: '/a', ts: 0},
        {xpath: '/b', ts: 100},
        {xpath: '/a', ts: 200},
    ];
    assert.equal(countRageBursts(clicks), 0);
});
