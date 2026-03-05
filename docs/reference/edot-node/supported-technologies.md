---
navigation_title: Supported technologies
description: Supported browsers and instrumentations in EDOT Browser.
applies_to:
  stack: ga
  serverless:
    observability: ga
products:
  - id: cloud-serverless
  - id: observability
  - id: edot-sdk
---

# Technologies supported by the EDOT Browser

The EDOT Browser is a [distribution](https://opentelemetry.io/docs/concepts/distributions/) of OpenTelemetry Browser.

:::{note}
**Understanding auto-instrumentation scope**

Auto-instrumentation automatically captures telemetry for the frameworks and libraries listed on this page. However, it cannot instrument:

- Custom or proprietary frameworks and libraries
- Closed-source components without instrumentation support
- Application-specific business logic

If your application uses technologies not covered by auto-instrumentation, you have two options:

1. **Native OpenTelemetry support** — Some frameworks and libraries include built-in OpenTelemetry instrumentation provided by the vendor.
2. **Manual instrumentation** — Use the [OpenTelemetry API](https://opentelemetry.io/docs/languages/js/instrumentation/) to add custom spans, metrics, and logs for unsupported components.
:::



## EDOT Collector and Elastic Stack versions

The {{edot}} Browser (EDOT Browser) sends data through the OpenTelemetry protocol (OTLP). While OTLP ingest works with later 8.16+ versions of the EDOT Collector, for full support use either [EDOT Collector](elastic-agent://reference/edot-collector/index.md) versions 9.x or [{{serverless-full}}](docs-content://deploy-manage/deploy/elastic-cloud/serverless.md) for OTLP ingest.

:::{note}
Ingesting data from EDOT SDKs through EDOT Collector 9.x into Elastic Stack versions 8.18+ is supported.
:::

Refer to [EDOT SDKs compatibility](opentelemetry://reference/compatibility/sdks.md) for support details.

## Browser versions

<!-- TODO -->

## TypeScript versions

Usage of `@elastic/opentelemetry-browser` in TypeScript code requires:

- TypeScript 5.0.4 or later
- Using `"module": "node16"` or "nodenext" in "tsconfig.json" to get support for handling the "exports" entry in package.json. This is so the `@elastic/opentelemetry-browser/sdk` entry-point can be used.


<!-- TODO: maybe there are more -->

## Instrumentations [instrumentations]

The following instrumentations are included in EDOT Browser. All are turned on by default, except those noted _disabled by default_.

The 🔹 symbol marks instrumentations that differ between EDOT Browser and OTel JS, or that only exist in EDOT Browser.

| Name | Packages instrumented | Notes |
|---|---|---|

<!-- TODO -->
