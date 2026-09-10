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

::::{dropdown} Switch to new user action instrumentation
User interaction instrumentation (@opentelemetry/instrumentation-user-interaction) has been replaced by `user-action` from `@opentelemetry/browser-instrumentation`. The new instrumentation emits log records (for example browser.user_action.click) instead of trace spans.
**Impact**<br>
- TypeScript users see a compilation error if they still use the old instrumentation key or options.
- At runtime, configuration under the old key is ignored.
- Clicks no longer produce spans. Subsequent fetch / XHR spans are no longer grouped under a click parent span in trace views.
- User actions are exported on the logs signal (/v1/logs), not traces.
- submit and other event types previously configured via eventNames are not supported by user-action (only click today). This change produces a compilation error 
**Action**<br>
- Change instrumentations['@opentelemetry/instrumentation-user-interaction'] to instrumentations['user-action'].
- Replace eventNames with autoCapturedActions (for example ['click']).
- Replace span hooks (shouldPreventSpanCreation) with applyCustomLogRecordData.
- Update dashboards/queries that relied on user-interaction spans to use user-action log events instead.
Refer to [PR #XX](https://github.com/elastic/elastic-otel-rum-js/pull/XX).
::::


::::{dropdown} Configuration change for export
The export configuration (url, headers) has been grouped to a new key named
`exportConfig`. This aligns with the configuration type of the upstream SDK.
**Impact**<br> This change produces a compilation error if you use the SDK with TypeScript.
At runtime the old configuration options will be ignored and EDOT will export to the default
endpoint `http://localhost:4318`.
**Action**<br> Put the `otlpEndpoint` configuration value into the new key `exportConfig.url`.
Put the `exportHeaders` configuration value into the new key `exportConfig.headers`.
Refer to [PR #100](https://github.com/elastic/elastic-otel-rum-js/pull/100).
::::


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

