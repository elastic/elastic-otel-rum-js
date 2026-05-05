# Testing @elastic/opentelemetry-browser

tl;dr: To run all tests locally:

```
npm ci
npm test:unit  # to test internal functionality
npm test:smoke # to do a sanity test
```

This package is a [distribution](https://opentelemetry.io/docs/concepts/distributions/)
of the OpenTelemetry Browser SDK (although it does not exist yet). Generally we strive to upstream as much
functionality as possible to OpenTelemetry. That extends to testing as well.
The testing in this package intends to test (a) functionality specific to
this distribution, plus (b) minimal quick sanity testing of some functionality
that is common to OpenTelemetry (e.g. small tests of each included
instrumentation).


## Testing in CI

This repo uses GitHub Actions for CI.
Currently all testing is handled by the "test-edot.yml" workflow.
Tests are run on every PR and are required to be passing before merge.

- test workflow: https://github.com/elastic/elastic-otel-rum-js/blob/main/.github/workflows/test-edot.yml
- "main" branch latest test runs: https://github.com/elastic/elastic-otel-rum-js/actions/workflows/test-edot.yml?query=branch%3Amain


## Testing locally for development

Running unit test for internal components and distribution logic.

```
npm run test:unit
```

Running just one unit test file:

```
node --test test/unit/detector.test.js
```


Running [smoke tests](https://en.wikipedia.org/wiki/Smoke_testing_(software)) of the distro.

```
npm run test:smoke
```


Running just one smoke test file. This requires to build the bundle.

```
npm run build && cp build/* ./test/smoke/assets
npx playwright test test/smoke/instr-document-load.spec.ts
```


## Requirements for writing test files

1. **All test files MUST match the `test/**/*.spec.js` glob pattern.**

2. **A test file MUST be runnable independently.**<br/>
  I.e. one can execute
    - `node --test ./test/unit/foo.spec.js` independent of other unit test files.
    - `npx playwright test ./test/smoke/bar.spec.js` independent of other smoke test files.

3.  **A test file MUST exit with non-zero status to indicate failure.**
