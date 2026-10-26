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

// -- Main line

const params = process.argv.slice(2);
if (params.length === 0) {
    console.error('Usage: node scripts/set-canary-version.js SHA');
    process.exit(1);
}
const sha = params[0];
if (typeof sha !== 'string' || !/^[0-9a-fA-F]+$/.test(sha)) {
    console.error('Error: SHA should be a hex string');
    process.exit(1);
}
if (sha.length < 7) {
    console.error(
        'Error: SHA should be a at least 7 chars (short form of git sha)'
    );
    process.exit(1);
}

const ROOT_PATH = join(new URL(import.meta.url).pathname, '../..');
console.log(new URL(import.meta.url).pathname, ROOT_PATH);
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
            `Package ${pkgInfo.name}@${pkgInfo.version} found. Setting canary verison.`
        );

        const date = new Date().toISOString().replace(/-|T.+$/g, '');
        const canaryVersion = `${getNextVersion(pkgVersion)}-canary-${date}-${sha.slice(0, 7)}`;

        pkgInfo.verison = canaryVersion;
        writeFileSync(pkgJson, JSON.stringify(pkgInfo, null, 2), {
            encoding: 'utf-8',
        });
        console.log(`Vesion set to ${canaryVersion}`);
    }
}

// -- Helpers

/**
 * Just updates the minor
 * @param {string} version
 */
function getNextVersion(version) {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor + 1}.${patch}`;
}
