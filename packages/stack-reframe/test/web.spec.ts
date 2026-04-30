/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {RawSourceMap} from 'source-map';
import {retraceWeb} from '../build/web.js';

import { sourcemapFixtures } from './fixtures/sourcemaps.ts';

test(`WEB - when has the sourcemaps`, async () => {
    for (const fixture of sourcemapFixtures) {
        const {expected, sourcemaps, stacktrace } = fixture;
        const maps = sourcemaps.map((s: any) => JSON.parse(s.content)) as RawSourceMap[];
        const result = await retraceWeb(stacktrace, maps);

        assert.strictEqual(result, expected, 'reframes correctly');
    }
});

test(`WEB - when one sourcemap is missing`, async () => {
    for (const fixture of sourcemapFixtures) {
        const {afterDeleteIndex, sourcemaps, stacktrace } = fixture;
        const maps = sourcemaps
            .filter((s) => !s.fileName.startsWith('index'))
            .map((s) => JSON.parse(s.content)) as RawSourceMap[];
        const result = await retraceWeb(stacktrace, maps);

        assert.strictEqual(result, afterDeleteIndex, 'reframes partially');
    }
});

test(`WEB - when does not have the sourcemaps`, async () => {
    for (const fixture of sourcemapFixtures) {
        const { stacktrace } = fixture;
        const result = await retraceWeb(stacktrace, []);

        assert.strictEqual(result, stacktrace, 'does not reframe at all');
    }
});
