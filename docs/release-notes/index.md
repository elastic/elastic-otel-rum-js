---
navigation_title: EDOT Browser
description: Release notes for Elastic Distribution of OpenTelemetry Browser.
applies_to:
  stack:
  serverless:
    observability:
products:
  - id: cloud-serverless
  - id: observability
  - id: edot-sdk
---

# {{edot}} Browser release notes [edot-browser-release-notes]

Review the changes, fixes, and more in each version of {{edot}} Browser (EDOT Browser).

To check for breaking changes, see [EDOT Browser Breaking Changes](./breaking-changes.md).

To check for security updates, go to [Security announcements for the Elastic stack](https://discuss.elastic.co/c/announcements/security-announcements/31).

% Release notes include only features, enhancements, and fixes. Add breaking changes, deprecations, and known issues to the applicable release notes sections.
%
% ## version.next [edot-browser-X.X.X-release-notes]
%
% ### Features and enhancements [edot-browser-X.X.X-features-enhancements]
% *
%
% ### Fixes [edot-browser-X.X.X-fixes]
% *
%
% ### Chores [edot-browser-X.X.X-chores]
% *

## 0.2.0 [edot-browser-0.2.0-release-notes]

### Chores [edot-browser-0.2.0-chores]

* Update all `@opentelemetry/*` upstream package dependencies to the latest releases:
    - [`v2.7.0` release](https://github.com/open-telemetry/opentelemetry-js/releases/tag/v2.7.0) from opentelemetry-js
    - [`experimental/v0.215.0` release](https://github.com/open-telemetry/opentelemetry-js/releases/tag/experimental%2Fv0.215.0) from opentelemetry-js
    - [opentelemetry-js-contrib releases](https://github.com/open-telemetry/opentelemetry-js-contrib/releases) up to 2026-04-28
    - [`@opentelemetry/browser-instrumentation v0.3.0` release](https://github.com/open-telemetry/opentelemetry-browser/releases/tag/browser-instrumentation-v0.3.0) from opentelemetry-browser

## 0.1.0 [edot-browser-0.1.0-release-notes]

First release of the {{edot}} Browser.
