/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(
    new URL('../../../../scripts/report-bundle-size.js', import.meta.url)
);

function runReport(files, summary) {
    const env = {...process.env};
    delete env.GITHUB_STEP_SUMMARY;
    if (summary) {
        env.GITHUB_STEP_SUMMARY = summary;
    }
    return spawnSync(process.execPath, [script, ...files], {
        env,
        encoding: 'utf8',
    });
}

function makeTempDir(t) {
    const dir = mkdtempSync(join(tmpdir(), 'bundle-size-report-'));
    t.after(() => rmSync(dir, {recursive: true, force: true}));
    return dir;
}

test('reports byte sizes for each bundle, including compressed sizes', (t) => {
    const dir = makeTempDir(t);
    const first = join(dir, 'bundle.js');
    const second = join(dir, 'bundle.min.js');
    writeFileSync(first, 'a');
    writeFileSync(second, 'é');

    const result = runReport([first, second]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(
        result.stdout,
        /Raw \(bytes\).*gzip \(bytes\).*Brotli \(bytes\)/
    );
    assert.match(result.stdout, /\| bundle.js \| 1 \| 21 \| 5 \|/);
    assert.match(result.stdout, /\| bundle.min.js \| 2 \| 22 \| 6 \|/);
    assert.ok(!result.stdout.includes(dir));
});

test('appends the report to the job summary without replacing existing content', (t) => {
    const dir = makeTempDir(t);
    const bundle = join(dir, 'bundle.js');
    const summary = join(dir, 'summary.md');
    writeFileSync(bundle, 'a');
    writeFileSync(summary, 'Earlier step\n\n');

    const result = runReport([bundle], summary);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
        readFileSync(summary, 'utf8'),
        `Earlier step\n\n${result.stdout}`
    );
});

test('fails for missing bundles without publishing a partial report', (t) => {
    const dir = makeTempDir(t);
    const bundle = join(dir, 'bundle.js');
    const summary = join(dir, 'summary.md');
    writeFileSync(bundle, 'a');
    writeFileSync(summary, 'Earlier step\n');

    const result = runReport([bundle, join(dir, 'missing.js')], summary);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ENOENT/);
    assert.equal(result.stdout, '');
    assert.equal(readFileSync(summary, 'utf8'), 'Earlier step\n');
});

test('requires at least one bundle', () => {
    const result = runReport([]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Usage:/);
    assert.equal(result.stdout, '');
});
