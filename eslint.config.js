import baselinePlugin from 'eslint-plugin-baseline-js';
import yalhPlugin from 'eslint-plugin-yet-another-license-header';

const defaultLicense = `
/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */
`;

const licensePattern =
  /^\/\*\n \* Copyright Elasticsearch B.V. and contributors(?:, [^\n]+)*\n(?: \* Copyright [^\n]+\n)*(?: \*\n)? \* SPDX-License-Identifier: Apache-2\.0\n \*\/$/;

export default [
  {
    files: ['packages/**/*.{js,mjs}'],
    ignores: ['packages/*/build/**/*.js'],
    // ignores: ['**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      // parser: tseslint.parser,
      // enables type-aware linting to detect instance method usage
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      'baseline-js': baselinePlugin,
      'yet-another-license-header': yalhPlugin,
    },
    rules: {
      // Allow only "widely available" Baseline features
      "baseline-js/use-baseline": ["error", { available: "widely" }],
      'yet-another-license-header/header': [
        'error',
        {
          header: defaultLicense,
          allowedHeaderPatterns: [licensePattern],
        },
      ],
    },
  },
];