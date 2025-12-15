#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 
 * This script runs the the given argv in each package dir in this repo.
 * Basically this is something of a replacement for `npm run --workspaces ...`
 * since this repo no longer uses npm workspaces.
 * 
 * Usage: 
 *    node ./scripts/oneach.mjs COMMAND [ARGS...]
 *
 * You can set the `DEBUG=1` envvar to get some debug output.
 */


import {globSync} from 'node:fs';
import {execSync} from 'node:child_process';

const TOP = process.cwd();
const command = process.argv.slice(2).join(' ');
const packages = globSync([
  'examples/*/package.json',
  'packages/*/package.json',
]).map(p => `${TOP}/${p.replace('/package.json', '')}`);

for (const folder of packages) {
  execSync(command, {cwd: folder, encoding: 'utf-8'});
}