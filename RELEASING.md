# How to release packages in this repo

This repository can hold multiple npm packages (though npm workspaces are not
being used). Currently each package releases independently -- i.e. their
versioning is not tied to each other. A release of a package consists of (a) a
repo git tag at the appropriate commit and (b) one or more release artifacts
(typically a release published to npmjs.com).

For now the only package in this repo is [`@elastic/opentelemetry-browser`](./packages/opentelemetry-browser/).
The tag name for a release of the primary package will not use a prefix; other
packages will use a prefix (the basename of the npm package name). For example,

| Package                          | Tag Pattern            | Examples |
| -------------------------------- | ---------------------- | -------- |
| `@elastic/opentelemetry-browser` | `v*`                   | v1.0.0   |


## How to release `@elastic/opentelemetry-browser`

Assuming "x.y.z" is the release verison:

1. Choose the appropriate version number according to semver.

2. Create a PR with these changes:
    - Bump the "version" in "packages/opentelemetry-browser/package.json".
    - Run `npm install` in "packages/opentelemetry-browser/" to update "packages/opentelemetry-browser/package-lock.json".
    - Update release notes in "docs/release-notes/\*" as necessary.
    - Name the PR something like "release @elastic/opentelemetry-browser@x.y.z".

3. Get the PR approved and merged.

4. Working on the elastic repo (not a fork), tag the commit as follows:
    ```
    git tag vx.y.z
    git push origin vx.y.z
    ```
    The GitHub Actions "release" workflow will handle the release
    steps -- including the `npm publish`. See the appropriate run at:
    https://github.com/elastic/elastic-otel-rum-js/actions/workflows/release.yml


## Canary and dev releases (`@elastic/opentelemetry-browser`)

Besides semver releases from version tags, the [release workflow](https://github.com/elastic/elastic-otel-rum-js/actions/workflows/release.yml) publishes pre-release builds from arbitrary commits. These use a synthetic npm version derived from the current `package.json` version and the commit SHA (see `scripts/set-canary-version.js`): the next minor version, then `-canary-default`, a UTC date (`YYYYMMDD`), and the first seven characters of the commit SHA. For example, if `package.json` is `1.2.3` and the commit is `abcdef1234567890…` on 2025-10-26 UTC, the published version might look like `1.3.0-canary-default-20251026-abcdef1`.

Canary and dev publishes do **not** regenerate `NOTICE.md` or create a GitHub Release. Slack is notified only on failure.

### Automatic canary releases (push to `canary`)

On every push to the `canary` branch that touches `packages/opentelemetry-browser/**` or `.github/workflows/release.yml`, the `release-canary` job runs:

1. Checks out the branch at the pushed commit.
2. Runs `npm run ci-all`.
3. Sets the canary version for packages under `packages/` using that commit’s full SHA.
4. Publishes to npm with the **`canary`** dist-tag (`npm publish --tag canary`).

To consume the latest canary build:

```bash
npm install @elastic/opentelemetry-browser@canary
```

To install a specific canary version by number:

```bash
npm install @elastic/opentelemetry-browser@1.3.0-canary-20251026-abcdef1
```

Merge or push work intended for early adopters to `canary`; each qualifying push produces a new npm version under the `canary` tag.

### Manual dev release (specific revision)

To publish **one chosen commit** from any branch (for example a PR head or a SHA that is not on `canary`), use **workflow_dispatch** on the release workflow:

1. Open [release.yml → Run workflow](https://github.com/elastic/elastic-otel-rum-js/actions/workflows/release.yml).
2. Enter the name of the branch you want a release for.
3. If you want a specific commit instead of HEAD. Enter the **full** commit SHA (40 hex characters) in the `sha` input.
4. Run the workflow. The `release-manual` job checks out that revision, sets a similar canary version string from that commit, and publishes with the **`canary-{branch}`** dist-tag (`npm publish --tag canary-branch`). The suffix of the tag is the slugified version of the branch name (for branch `feature/central_config` the tag is `canary-feature-central-config`).

To consume the latest dev build:

```bash
npm install @elastic/opentelemetry-browser@canary-{branch}
```

Use **`canary`** for continuous pre-releases from the `canary` branch; use **`canary-{branch}`** when you need a one-off publish of a particular revision without merging to `canary`.


## How to release other packages

This section will be filled when a new package and its corresponding release workflow are included in ths repo.