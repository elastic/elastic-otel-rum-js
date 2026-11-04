/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import {
    generateVersionFile,
    getVersionsFromEdotPackage,
} from './set-edot-versions.js';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const script = join(scriptsDir, 'set-edot-versions.js');
const repoRoot = join(scriptsDir, '..');
const edotPath = join(repoRoot, 'packages/opentelemetry-browser');
const fixtureDir = join(scriptsDir, 'fixtures/set-edot-versions');

function runScript() {
    return spawnSync(process.execPath, [script], {
        encoding: 'utf8',
    });
}

test('stdout matches packages/opentelemetry-browser/lib/version.js', () => {
    const versionPath = join(edotPath, 'lib/version.js');
    const expected = readFileSync(versionPath, {encoding: 'utf-8'});
    const result = runScript();

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trimEnd(), expected.trimEnd());
});

test('updates version constants from fixture package.json', () => {
    const edotInfo = JSON.parse(
        readFileSync(join(fixtureDir, 'package.json'), {encoding: 'utf-8'})
    );
    const versionTemplate = readFileSync(join(fixtureDir, 'version.js'), {
        encoding: 'utf-8',
    });

    const result = generateVersionFile(edotInfo, versionTemplate);

    assert.ok(!('error' in result));
    assert.match(result.content, /EDOT_VERSION = '1\.2\.3'/);
    assert.match(
        result.content,
        /OTEL_BROWSER_INSTRUMENTATION_VERSION = '0\.9\.4'/
    );
});

test('coerces semver ranges in package.json dependencies', () => {
    const versions = getVersionsFromEdotPackage({
        version: '2.0.0',
        dependencies: {
            '@opentelemetry/browser-instrumentation': '~1.4.5',
        },
    });

    assert.equal(versions.edotVersion, '2.0.0');
    assert.equal(versions.otelInstrVersion, '1.4.5');
});

test('reports error when browser instrumentation version cannot be resolved', () => {
    const result = generateVersionFile(
        {
            version: '1.0.0',
            dependencies: {
                '@opentelemetry/browser-instrumentation': 'not-a-version',
            },
        },
        readFileSync(join(fixtureDir, 'version.js'), {encoding: 'utf-8'})
    );

    assert.ok('error' in result);
    assert.equal(result.error, 'not-a-version');
});
