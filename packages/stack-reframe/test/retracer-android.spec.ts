/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import type {AndroidSourceMap} from '../src/retracer-android.js';
import {RetracerAndroid} from '../src/retracer-android.js';

import { androidMapFixtures } from './fixtures/androidmaps.js';

test(`Android - when has the sourcemaps`, async () => {
    for (const fixture of androidMapFixtures) {
        const {expected, sourcemaps, stacktrace } = fixture;
        const maps = sourcemaps.map((s: any) => JSON.parse(s.content)) as AndroidSourceMap[];
        const retracer = new RetracerAndroid(stacktrace, {fetch: () => Promise.resolve(maps)})
        const result = await retracer.retrace();

        assert.strictEqual(result, expected, 'retraces correctly');
    }
});