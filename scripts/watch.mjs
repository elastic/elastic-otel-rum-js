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

const DEBUG = process.env.DEBUG;
const TOP = process.cwd();
const file = process.argv[2];
const command = process.argv.slice(3).join(' ');
const fullPath = `${TOP}/${file}`;

try {
    const stat = lstatSync(`${TOP}/${file}`, {throwIfNoEntry: true});
    const isDir = stat.isDirectory();
    if (DEBUG) {
        console.log(`Watching ${isDir ? 'directory' : 'file'} ${file}`);
    }
    watch(fullPath, {recursive: stat.isDirectory()}, () => {
        if (DEBUG) {
            console.log(`Change detected executing command "${command}"`);
        }
        try {
            const output = execSync(command, {cwd: TOP});
            if (DEBUG) {
                console.log(`Success\n${output}`);
            }
        } catch (execErr) {
            console.log(`Command error "${execErr.message}"`);
        }
    });
} catch (err) {
    console.log('Watch error', err);
    process.exit(-1);
}
