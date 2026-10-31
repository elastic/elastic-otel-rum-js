/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {appendFileSync, readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {brotliCompressSync, gzipSync} from 'node:zlib';

const files = process.argv.slice(2);
if (files.length === 0) {
    console.error('Usage: node scripts/report-bundle-size.js FILE [FILE ...]');
    process.exit(1);
}

const rows = files.map((file) => {
    const bundle = readFileSync(file);
    return `| ${basename(file)} | ${bundle.length} | ${gzipSync(bundle).length} | ${brotliCompressSync(bundle).length} |`;
});
const report = [
    '## Bundle sizes',
    '',
    '| Bundle | Raw (bytes) | gzip (bytes) | Brotli (bytes) |',
    '| --- | ---: | ---: | ---: |',
    ...rows,
    '',
].join('\n');

if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
}
process.stdout.write(report);
