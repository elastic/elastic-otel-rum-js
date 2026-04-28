/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {RawSourceMap} from 'source-map';
import {retraceWeb} from '../build/web.js';

test(`web works`, async () => {
    const result = await retraceWeb('', {} as RawSourceMap);

    assert.equal(result, 'foo');
});
