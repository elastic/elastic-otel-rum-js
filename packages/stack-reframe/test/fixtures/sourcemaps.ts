/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';

interface SourceMapFixture {
  afterDeleteIndex: string;
  expected: string;
  stacktrace: string;
  sourcemaps: Array<{
    content: string;
    fileName: string;
  }>;
}

export const sourcemapFixtures: SourceMapFixture[] = [
  {
    afterDeleteIndex: `Uncaught Error: Error!
  at u (index-d803759c.js:1:785)
  at i (index-d803759c.js:1:831)
  at (../../node_modules/react-dom/cjs/react-dom.production.min.js:54:316)
  at (../../node_modules/react-dom/cjs/react-dom.production.min.js:54:470)
  at (../../node_modules/react-dom/cjs/react-dom.production.min.js:55:34)
  at Ub (../../node_modules/react-dom/cjs/react-dom.production.min.js:105:67)
  at nf (../../node_modules/react-dom/cjs/react-dom.production.min.js:106:379)
  at se (../../node_modules/react-dom/cjs/react-dom.production.min.js:117:103)
  at a (../../node_modules/react-dom/cjs/react-dom.production.min.js:274:41)
  at Gb (../../node_modules/react-dom/cjs/react-dom.production.min.js:52:374)`,
    expected: `Uncaught Error: Error!
  at u (../../src/utils.ts:2:8)
  at throwError (../../src/App.tsx:5:15)
  at Object.Dc (../../node_modules/react-dom/cjs/react-dom.production.min.js:54:316)
  at Fc (../../node_modules/react-dom/cjs/react-dom.production.min.js:54:470)
  at jc (../../node_modules/react-dom/cjs/react-dom.production.min.js:55:34)
  at Ub (../../node_modules/react-dom/cjs/react-dom.production.min.js:105:67)
  at nf (../../node_modules/react-dom/cjs/react-dom.production.min.js:106:379)
  at se (../../node_modules/react-dom/cjs/react-dom.production.min.js:117:103)
  at a (../../node_modules/react-dom/cjs/react-dom.production.min.js:274:41)
  at Gb (../../node_modules/react-dom/cjs/react-dom.production.min.js:52:374)`,
    sourcemaps: fs.readdirSync(path.resolve(import.meta.dirname, 'sourcemaps')).map(fileName => ({
      content: fs.readFileSync(path.resolve(import.meta.dirname, 'sourcemaps', fileName)).toString(),
      fileName,
    })),
    stacktrace: `Uncaught Error: Error!
  at u (index-d803759c.js:1:785)
  at i (index-d803759c.js:1:831)
  at Object.Dc (vendor-221d27ba.js:37:9852)
  at Fc (vendor-221d27ba.js:37:10006)
  at jc (vendor-221d27ba.js:37:10063)
  at ii (vendor-221d27ba.js:37:31442)
  at Xs (vendor-221d27ba.js:37:31859)
  at vendor-221d27ba.js:37:36771
  at Co (vendor-221d27ba.js:40:36724)
  at gs (vendor-221d27ba.js:37:8988)`,
  }
];

