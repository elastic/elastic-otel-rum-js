/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync, rmSync, writeFileSync, mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(
    new URL('./set-canary-version.js', import.meta.url)
);

/**
 * @param {string} hash
 * @param {string} name
 * @param {string} cwd
 */
function runScript(hash, name, cwd) {
    const env = {...process.env};
    console.log('run', script, hash, name);
    return spawnSync(process.execPath, [script, hash, name], {
        cwd,
        env,
        encoding: 'utf8',
    });
}

/**
 * @param {import('node:test').TestContext} t
 * @param {Array<{name: string; version: string}>} pkgs
 */
function makeTempDir(t, pkgs) {
    const root = join(tmpdir(), 'set-canary-version');
    for (const p of pkgs) {
        const dir = join(root, 'packages', p.name);
        const file = join(dir, 'package.json');
        mkdirSync(dir, {recursive: true});
        writeFileSync(file, JSON.stringify(p), {encoding: 'utf-8'});
    }
    t.after(() => rmSync(root, {recursive: true, force: true}));
    return root;
}

test('should update the versions of all packages inside the repo', (t) => {
    const packages = [
        {name: 'package-a', version: '0.1.2', next: '0.2.0'},
        {name: 'package-b', version: '3.4.5', next: '3.5.0'},
    ];
    const dir = makeTempDir(t, packages);
    const sha = randomBytes(20).toString('hex');
    const date = new Date().toISOString().replace(/-|T.+$/g, '');
    const result = runScript(sha, 'feat-test', dir);

    assert.equal(result.status, 0, result.stderr);

    for (const pkg of packages) {
        const path = join(dir, `packages/${pkg.name}/package.json`);
        const pkgInfo = JSON.parse(readFileSync(path, {encoding: 'utf-8'}));

        assert.equal(
            pkgInfo.version,
            `${pkgInfo.next}-canary-feat-test-${date}-${sha.slice(0, 7)}`
        );
    }
});

test('should slugify the feature name given to the script', (t) => {
    const packages = [
        {name: 'package-a', version: '0.1.2', next: '0.2.0'},
        {name: 'package-b', version: '3.4.5', next: '3.5.0'},
    ];
    const dir = makeTempDir(t, packages);
    const sha = randomBytes(20).toString('hex');
    const date = new Date().toISOString().replace(/-|T.+$/g, '');
    const result = runScript(sha, 'feature/log_buffering', dir);

    assert.equal(result.status, 0, result.stderr);

    for (const pkg of packages) {
        const path = join(dir, `packages/${pkg.name}/package.json`);
        const pkgInfo = JSON.parse(readFileSync(path, {encoding: 'utf-8'}));

        assert.equal(
            pkgInfo.version,
            `${pkgInfo.next}-canary-feature-log-buffering-${date}-${sha.slice(0, 7)}`
        );
    }
});
