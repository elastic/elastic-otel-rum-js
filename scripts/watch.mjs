#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 *
 * This script runs the the given a command whe the given file or
 * files within a directory have changed. The command is run from
 * the directory where the user runs the script.
 *
 * Usage:
 *    node ./scripts/watch.mjs FILE COMMAND
 *
 * You can set the `DEBUG=1` envvar to get some debug output.
 */

import {watch, lstatSync} from 'node:fs';
import {execSync} from 'node:child_process';

const TOP = process.cwd();
const file = process.argv[2];
const command = process.argv.slice(3).join(' ');
const fullPath = `${TOP}/${file}`;

console.log('file', file);
console.log('command', command);
try {
    const stat = lstatSync(`${TOP}/${file}`, {throwIfNoEntry: true});
    watch(fullPath, {recursive: stat.isDirectory()}, () => {
        execSync(command, {cwd: TOP});
    });
} catch (err) {
    console.log('Watch error', err);
    process.exit(-1);
}
