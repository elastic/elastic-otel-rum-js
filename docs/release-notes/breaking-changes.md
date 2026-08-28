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

::::{dropdown} Configuration change in fetch instrumentation
The configuration key for `fetch` instrumentation has changed from
`@opentelemetry/instrumentation-fetch` to a shorter name `fetch`.
**Impact**<br> This change produces a compilation error if you use the SDK with TypeScript.
At runtime the configuration will be ignored if using the old configuration key.
**Action**<br> Change the configuration key to `fetch`.
Refer to [PR #97](https://github.com/elastic/elastic-otel-rum-js/pull/97).
::::

::::{dropdown} Configuration change in XmlHttpRequest instrumentation
The configuration key for `xml-http-request` instrumentation has changed from
`@opentelemetry/instrumentation-xml-http-request` to a shorter name `xhr`.
**Impact**<br> This change produces a compilation error if you use the SDK with TypeScript.
At runtime the configuration will be ignored if using the old configuration key.
**Action**<br> Change the configuration key to `xhr`.
Refer to [PR #97](https://github.com/elastic/elastic-otel-rum-js/pull/97).
::::

::::{dropdown} Signature change in XmlHttpRequest `applyCustomAttributesOnSpan` hook
The `applyCustomAttributesOnSpan` callback for `xhr` instrumentation now receives
`(span, xhr)` instead of `(span, xhr, result)`.
**Impact**<br> Custom attribute hooks that read the third `result` argument will no
longer receive response data. TypeScript users may see compilation errors if their
hook signature still expects three arguments.
**Action**<br> Update `xhr` instrumentation hooks to use `(span, xhr)` and read
response attributes from the `xhr` object (for example, `xhr.status`) instead of
the removed third argument.
Refer to [PR #97](https://github.com/elastic/elastic-otel-rum-js/pull/97).
::::

::::{dropdown} Removal of `ignoreNetworkEvents` in fetch and XmlHttpRequest instrumentations
The `ignoreNetworkEvents` configuration option is no longer supported for `fetch`
and `xhr` instrumentations.
**Impact**<br> If you previously set `ignoreNetworkEvents: true` to suppress network
events on HTTP spans, that setting is ignored and network events may appear in
exported spans again.
**Action**<br> Remove `ignoreNetworkEvents` from your `fetch` and `xhr`
instrumentation configuration. If you need to exclude specific requests from
tracing, use `ignoreUrls` instead.
Refer to [PR #97](https://github.com/elastic/elastic-otel-rum-js/pull/97).
::::

::::{dropdown} Configuration change in navigation instrumentation
The configuration key for `navigation` instrumentation has changed from `@opentelemetry/instrumentation-browser-navigation`
to a shorter name `navigation`.
**Impact**<br> This change produces a compilation error if you use the SDK with TypeScript. At runtime the configuration
will be ignored if using the old configuration key.
**Action**<br> Change the configuration key to `navigation`.
Refer to [PR #96](https://github.com/elastic/elastic-otel-rum-js/pull/96).
::::

::::{dropdown} Configuration change in web exception instrumentation
The configuration key for `web-exception` instrumentation has changed from `@opentelemetry/instrumentation-web-exception`
to a shorter name `errors`.
**Impact**<br> This change produces a compilation error if you use the SDK with TypeScript. At runtime the configuration
will be ignored if using the old configuration key.
**Action**<br> Change the configuration key to `errors`.
Refer to [PR #95](https://github.com/elastic/elastic-otel-rum-js/pull/95).
::::

