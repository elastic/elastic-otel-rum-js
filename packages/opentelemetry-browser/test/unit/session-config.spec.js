/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {resolveSessionTimeouts} from '../../lib/session/config.js';

test('resolveSessionTimeouts - uses defaults when not set', () => {
    assert.deepStrictEqual(resolveSessionTimeouts({}), {
        inactivityTimeout: 1800,
        maxDuration: 14400,
    });
});

test('resolveSessionTimeouts - keeps valid values', () => {
    assert.deepStrictEqual(
        resolveSessionTimeouts({inactivityTimeout: 600, maxDuration: 7200}),
        {inactivityTimeout: 600, maxDuration: 7200}
    );
});

test('resolveSessionTimeouts - falls back to defaults on invalid values', () => {
    for (const value of [0, -1, NaN, Infinity, '600']) {
        assert.deepStrictEqual(
            // @ts-expect-error - testing invalid input
            resolveSessionTimeouts({
                inactivityTimeout: value,
                maxDuration: value,
            }),
            {inactivityTimeout: 1800, maxDuration: 14400},
            `value: ${String(value)}`
        );
    }
});

test('resolveSessionTimeouts - clamps values to the allowed range', () => {
    assert.deepStrictEqual(
        resolveSessionTimeouts({inactivityTimeout: 60, maxDuration: 600}),
        {inactivityTimeout: 300, maxDuration: 1800}
    );
    assert.deepStrictEqual(
        resolveSessionTimeouts({maxDuration: 48 * 60 * 60}),
        {inactivityTimeout: 1800, maxDuration: 86400}
    );
});

test('resolveSessionTimeouts - caps inactivity at max duration', () => {
    assert.deepStrictEqual(
        resolveSessionTimeouts({inactivityTimeout: 7200, maxDuration: 3600}),
        {inactivityTimeout: 3600, maxDuration: 3600}
    );
});
