---
navigation_title: Configuration
description: How to configure the Elastic Distribution of OpenTelemetry Browser (EDOT Browser) using environment variables.
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

# Configure the EDOT Browser SDK

The {{edot}} Browser (EDOT Browser) is configured with environment variables beginning with `OTEL_` or `ELASTIC_OTEL_`. Any `OTEL_*` environment variables behave the same as with the OpenTelemetry SDK. For example, all the OpenTelemetry [General SDK Configuration env vars](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#general-sdk-configuration) are supported. If EDOT Browser provides a configuration setting specific to the Elastic distribution, it will begin with `ELASTIC_OTEL_`.


## Basic configuration

If not configured, EDOT Browser will send telemetry data to `http://localhost:4318` with no authentication information, and identify the running service as `unknown_service:web`. Typically a minimal configuration will include

<!-- TODO -->


## Configuration reference


<!-- TODO -->
