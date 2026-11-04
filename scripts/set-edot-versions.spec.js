/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import {execSync, spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import {
    generateVersionFile,
    getVersionsFromNpmLsOutput,
} from './set-edot-versions.js';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const script = join(scriptsDir, 'set-edot-versions.js');
const repoRoot = join(scriptsDir, '..');
const edotPath = join(repoRoot, 'packages/opentelemetry-browser');
const fixtureDir = join(scriptsDir, 'fixtures/set-edot-versions');

/**
 * @param {string} [npmLsOutput]
 * @returns {ReturnType<import('node:child_process').SpawnSyncReturns<string>>}
 */
function runScript(npmLsOutput) {
    const input =
        npmLsOutput ?? execSync('npm ls', {cwd: edotPath, encoding: 'utf-8'});
    return spawnSync(process.execPath, [script], {
        encoding: 'utf8',
        input,
    });
}

test('stdout matches packages/opentelemetry-browser/lib/version.js', () => {
    const versionPath = join(edotPath, 'lib/version.js');
    const expected = readFileSync(versionPath, {encoding: 'utf-8'});
    const result = runScript();

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trimEnd(), expected.trimEnd());
});

test('updates version constants from fixture npm ls output', () => {
    const npmLsOutput = readFileSync(join(fixtureDir, 'npm-ls.txt'), {
        encoding: 'utf-8',
    });
    const versionTemplate = readFileSync(join(fixtureDir, 'version.js'), {
        encoding: 'utf-8',
    });

    const result = generateVersionFile(npmLsOutput, versionTemplate);

    assert.ok(!('error' in result));
    assert.match(result.content, /EDOT_VERSION = '1\.2\.3'/);
    assert.match(
        result.content,
        /OTEL_BROWSER_INSTRUMENTATION_VERSION = '0\.9\.4'/
    );
});

test('parses edot version from the first line of npm ls output', () => {
    const npmLsOutput = `@elastic/opentelemetry-browser@2.0.0 /path/to/pkg
└── @opentelemetry/browser-instrumentation@1.4.5
`;

    const versions = getVersionsFromNpmLsOutput(npmLsOutput);

    assert.equal(versions.edotVersion, '2.0.0');
    assert.equal(versions.otelInstrVersion, '1.4.5');
});

test('reports error when browser instrumentation version cannot be resolved', () => {
    const npmLsOutput = `@elastic/opentelemetry-browser@1.0.0 /path
└── @opentelemetry/browser-instrumentation@not-a-version
`;
    const result = generateVersionFile(
        npmLsOutput,
        readFileSync(join(fixtureDir, 'version.js'), {encoding: 'utf-8'})
    );

    assert.ok('error' in result);
    assert.equal(result.error, 'not-a-version');
});
