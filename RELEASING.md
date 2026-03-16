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


## How to release other packages

This section will be filled when a new package and its corresponding release workflow are included in ths repo.