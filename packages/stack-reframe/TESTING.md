# Testing @elastic/opentelemetry-browser

tl;dr: To run all tests locally:

```
npm ci
npm test
```


## Requirements for writing test files

1. **All test files MUST match the `test/**/*.spec.ts` glob pattern.**

2. **A test file MUST be runnable independently.**<br/>
  I.e. one can execute
    - `npx tsx ./test/foo.spec.ts` independent of other unit test files.

3.  **A test file MUST exit with non-zero status to indicate failure.**
