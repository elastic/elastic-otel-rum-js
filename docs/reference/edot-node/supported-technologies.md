---
navigation_title: Supported Technologies
description: Supported technologies for the Elastic Distribution of OpenTelemetry Browser (EDOT Browser).
applies_to:
  stack:
  serverless:
    observability:
  product:
    edot_node: ga
products:
  - id: cloud-serverless
  - id: observability
  - id: edot-sdk
---

# Technologies supported by the EDOT Browser SDK

<!-- TODO -->


## EDOT Collector and Elastic Stack versions

<!-- TODO: check version of mOTLP that supports CORS -->

The {{edot}} Browser (EDOT Browser) sends data through the OpenTelemetry protocol (OTLP). While OTLP ingest works with later 8.16+ versions of the EDOT Collector, for full support use either [EDOT Collector](elastic-agent://reference/edot-collector/index.md) versions 9.x or [{{serverless-full}}](docs-content://deploy-manage/deploy/elastic-cloud/serverless.md) for OTLP ingest.

:::{note}
Ingesting data from EDOT SDKs through EDOT Collector 9.x into Elastic Stack versions 8.18+ is supported.
:::

Refer to [EDOT SDKs compatibility](opentelemetry://reference/compatibility/sdks.md) for support details.

## Browser versions

<!-- TODO -->


## Instrumentations [instrumentations]

The following instrumentations are included in EDOT Browser. All are turned on by default, except those noted _disabled by default_.

The 🔹 symbol marks instrumentations that differ between EDOT Browser and OTel JS, or that only exist in EDOT Browser.

| Name | Packages instrumented | Notes |
|---|---|---|

<!-- TODO -->
