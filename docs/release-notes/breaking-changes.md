---
navigation_title: Breaking changes
description: Breaking changes for Elastic Distribution of OpenTelemetry Browser.
applies_to:
  stack:
  serverless:
    observability:
products:
  - id: cloud-serverless
  - id: observability
  - id: edot-sdk
---

# {{edot}} Browser breaking changes [edot-browser-breaking-changes]

Breaking changes can impact your applications, potentially disrupting normal operations. Before you upgrade, carefully review the {{edot}} breaking changes and take the necessary steps to mitigate any issues.

% ## Next version [edot-browser-X.X.X-breaking-changes]

% Use the following template to add entries to this document.

% TEMPLATE START
% ::::{dropdown} Title of breaking change
% Description of the breaking change.
% **Impact**<br> Impact of the breaking change.
% **Action**<br> Steps for mitigating impact.
% Refer to [PR #](PR link).
% ::::
% TEMPLATE END

## Next version [edot-browser-X.X.X-breaking-changes]

::::{dropdown} Configuration change in navigation instrumentation
The configuration key for `web-exception` instrumentation has changed from `@opentelemetry/instrumentation-web-exception`
to a shorter name `errors`.
**Impact**<br> This change eproduces a compilation error if you use the SDK with TypeScript. At runtime the configuration
will be ignored if using the old configuration key.
**Action**<br> Change the configuration key to `errors`.
Refer to [PR 96#](https://github.com/elastic/elastic-otel-rum-js/pull/95).
::::

