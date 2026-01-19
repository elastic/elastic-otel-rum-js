#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 *
 * This script runs the the given argv in each package dir in this repo.
 * Basically this is something of a replacement for `npm run --workspaces ...`
 * since this repo does not use npm workspaces.
 *
 * It ends when all tasks are complete or when one task fails (failfast).
 *
 * Usage:
 *    node ./scripts/oneach.mjs COMMAND [ARGS...]
 *
 * You can set the `DEBUG=1` envvar to get some debug output.
 */

import {globSync} from 'node:fs';
import {exec} from 'node:child_process';

const DEBUG = process.env.DEBUG;
const TOP = process.cwd();
const command = process.argv.slice(2).join(' ');
const packages = globSync([
    'examples/*/package.json',
    'packages/*/package.json',
]).map((p) => `${TOP}/${p.replace('/package.json', '')}`);

for (const folder of packages) {
    if (DEBUG) {
        console.log(`executing "${command}" on folder "${folder}"`);
    }
    exec(command, (err, stdout, stderr) => {
        console.log(`Command ${err ? 'FAILURE' : 'SUCCESS'}`);
        if (err) {
            console.log(`Error(code: ${err.code || 'unset'}):: ${err.message}`);
            console.log(`:::stdout:::\n${stdout}`);
            console.log(`:::stderrr:::\n${stderr}`);
            process.exit(err.code || -1);
        }
        if (DEBUG) {
            console.log(`:::stdout:::\n${stdout}`);
        }
    });
}
