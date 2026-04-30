/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';

interface AndroidMapFixture {
  expected: string;
  stacktrace: string;
  sourcemaps: Array<{
    content: string;
    fileName: string;
  }>;
}

export const androidMapFixtures: AndroidMapFixture[] = [
  {
    sourcemaps: fs.readdirSync(path.resolve(import.meta.dirname, 'androidmaps')).map(fileName => ({
      content: fs.readFileSync(path.resolve(import.meta.dirname, 'androidmaps', fileName)).toString(),
      fileName,
    })),
    expected: `__multi line stack trace (resolved) here__`,
    stacktrace: `__multi line stack trace here__`,
  }
];

