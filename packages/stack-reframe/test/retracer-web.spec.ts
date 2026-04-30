/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {RawSourceMap} from 'source-map';
import {RetracerWeb} from '../src/retracer-web.js';

import { sourcemapFixtures } from './fixtures/sourcemaps.js';

test(`WEB - when has the sourcemaps`, async () => {
    for (const fixture of sourcemapFixtures) {
        const {expected, sourcemaps, stacktrace } = fixture;
        const maps = sourcemaps.map((s: any) => JSON.parse(s.content)) as RawSourceMap[];
        const retracer = new RetracerWeb(stacktrace, {fetch: () => Promise.resolve(maps)})
        const result = await retracer.retrace();

        assert.strictEqual(result, expected, 'reframes correctly');
    }
});

test(`WEB - when one sourcemap is missing`, async () => {
    for (const fixture of sourcemapFixtures) {
        const {afterDeleteIndex, sourcemaps, stacktrace } = fixture;
        const maps = sourcemaps
            .filter((s) => !s.fileName.startsWith('index'))
            .map((s) => JSON.parse(s.content)) as RawSourceMap[];
        const retracer = new RetracerWeb(stacktrace, {fetch: () => Promise.resolve(maps)})
        const result = await retracer.retrace();

        assert.strictEqual(result, afterDeleteIndex, 'reframes partially');
    }
});

test(`WEB - when does not have the sourcemaps`, async () => {
    for (const fixture of sourcemapFixtures) {
        const { stacktrace } = fixture;
        const retracer = new RetracerWeb(stacktrace, {fetch: () => Promise.resolve([])})
        const result = await retracer.retrace();

        assert.strictEqual(result, stacktrace, 'does not reframe at all');
    }
});
