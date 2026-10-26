/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    existsSync,
    readdirSync,
    readFileSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import {join} from 'node:path';

import semver from 'semver';

// -- Main line

const params = process.argv.slice(2);
if (params.length === 0) {
    console.error('Usage: node scripts/set-canary-version.js SHA');
    process.exit(1);
}
const sha = params[0];
if (typeof sha !== 'string' || !/^[0-9a-fA-F]+$/.test(sha)) {
    console.error('Error: input should be a hex string');
    process.exit(1);
}
if (sha.length < 40) {
    console.error(
        'Error: input should be a full commit SHA (min 40 chars long)'
    );
    process.exit(1);
}

const ROOT_PATH = process.cwd();
const PKGS_PATH = join(ROOT_PATH, 'packages');
const packageNames = readdirSync(PKGS_PATH);

for (const name of packageNames) {
    const pkgPath = join(PKGS_PATH, name);
    const pkgStat = statSync(pkgPath);
    const pkgJson = join(pkgPath, 'package.json');

    if (pkgStat.isDirectory() && existsSync(pkgJson)) {
        const pkgInfo = JSON.parse(readFileSync(pkgJson, {encoding: 'utf-8'}));
        const pkgVersion = pkgInfo.version;
        console.log(
            `Package ${pkgInfo.name}@${pkgInfo.version} found. Setting canary version.`
        );

        const date = new Date().toISOString().replace(/-|T.+$/g, '');
        const canaryVersion = `${semver.inc(pkgVersion, 'minor')}-canary-${date}-${sha.slice(0, 7)}`;

        pkgInfo.version = canaryVersion;
        writeFileSync(pkgJson, JSON.stringify(pkgInfo, null, 2), {
            encoding: 'utf-8',
        });
        console.log(`Version set to ${canaryVersion}`);
    }
}
