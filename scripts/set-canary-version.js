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
    console.error('Usage: node scripts/set-canary-version.js SHA NAME');
    process.exit(1);
}
const sha = params[0];
if (typeof sha !== 'string' || !/^[0-9a-fA-F]{40}$/.test(sha)) {
    console.error(
        `Error: sha "${sha}" should be a full commit SHA (40 hex chars)`
    );
    process.exit(1);
}
const name = params[1];
if (typeof name !== 'string' || name.length === 0) {
    console.error('Error: name should be a non empty string');
    process.exit(1);
}
// Slugify the name given `feature/my_changes` => `feature-my-changes`
const slug = name.replaceAll(/[^a-zA-Z0-9]/g, '-');

const ROOT_PATH = process.cwd();
const PKGS_PATH = join(ROOT_PATH, 'packages');
const packageNames = readdirSync(PKGS_PATH);

for (const pkgName of packageNames) {
    const pkgPath = join(PKGS_PATH, pkgName);
    const pkgStat = statSync(pkgPath);
    const pkgJson = join(pkgPath, 'package.json');

    if (pkgStat.isDirectory() && existsSync(pkgJson)) {
        const pkgInfo = JSON.parse(readFileSync(pkgJson, {encoding: 'utf-8'}));
        const pkgVersion = pkgInfo.version;
        console.log(
            `Package ${pkgInfo.name}@${pkgInfo.version} found. Setting canary version.`
        );

        const date = new Date().toISOString().replace(/-|T.+$/g, '');
        const canaryVersion = `${semver.inc(pkgVersion, 'minor')}-canary-${slug}-${date}-${sha.slice(0, 7)}`;

        pkgInfo.version = canaryVersion;
        writeFileSync(pkgJson, JSON.stringify(pkgInfo, null, 2), {
            encoding: 'utf-8',
        });
        console.log(`Version set to ${canaryVersion}`);
    }
}
