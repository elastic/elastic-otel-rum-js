/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {nodeResolve} from '@rollup/plugin-node-resolve';

export default {
    input: 'src/index.js',
    context: 'window',
    external: [],
    output: {
        file: 'build/bundle.js',
        format: 'iife',
        sourcemap: true,
    },
    plugins: [
        nodeResolve({
            browser: true,
            mainFields: ['browser', 'module', 'main'],
        }),
    ],
};
