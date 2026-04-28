/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import type {AndroidSourceMap} from '../build/android.js';
import {retraceAndroid} from '../build/android.js';

test(`android works`, async () => {
    const result = await retraceAndroid('', {} as AndroidSourceMap);

    assert.equal(result, 'foo');
});