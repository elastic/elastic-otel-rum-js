/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {resolveFrustrationConfig} from '../../lib/frustration/config.js';

test('resolveFrustrationConfig', () => {
    assert.deepEqual(resolveFrustrationConfig(undefined), {});
    assert.deepEqual(resolveFrustrationConfig(true), {});
    assert.equal(resolveFrustrationConfig(false), undefined);
    assert.deepEqual(resolveFrustrationConfig({ignoreSelectors: ['.map']}), {
        ignoreSelectors: ['.map'],
    });
    for (const invalid of [
        'yes',
        null,
        {ignoreSelectors: '.map'},
        {ignoreSelectors: ['']},
        {ignoreSelectors: [1]},
    ]) {
        assert.deepEqual(
            resolveFrustrationConfig(/** @type {any} */ (invalid)),
            {}
        );
    }
});
