---
navigation_title: Configuration
description: Configure the Elastic Distribution of OpenTelemetry Browser (EDOT Browser).
applies_to:
  stack: ga
  serverless:
    observability: ga
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

### Supported configuration settings [supported-configuration-settings]

Configuration is passed as an object to `startBrowserSdk`. The following options are supported:

| Option | Description |
|---|---|
| `serviceName` | Logical name of the frontend service. Set the `service.name` resource attribute. Defaults to `unknown_service:web` if not set. |
| `serviceVersion` | Version of the application. Set the `service.version` resource attribute. Optional. |
| `logLevel` | Log level used by the SDK internal logger. The default value is `info`. Use `verbose` for troubleshooting. One of `all`, `verbose`, `debug`, `info`, `warn`, `error`, `none`. |
| `otlpEndpoint` | Base URL of the OTLP export endpoint (reverse proxy). Do not include signal paths such as `/v1/traces`. Defaults to `http://localhost:4318`. |
| `sampleRate` | Trace sampling ratio (0–1). Defaults to `1` (100%). |
| `resourceAttributes` | Optional resource attributes to attach to telemetry. |
| `exportHeaders` | Headers to send with export requests. Defaults to `{}`. The reverse proxy typically injects `Authorization`; do not put API keys here in browser code. |
| `disabled` | If `true`, the SDK does not start. |
| `instrumentations` | Per-instrumentation config. Set `{enabled: false}` for a key to turn off that instrumentation. the possible keys are `document-load`, `fetch`, `long-task`, `xml-http-request`, `user-interaction`, `web-exception`, `web-vitals` |

<!-- TODO -->

## Central configuration

APM Agent Central Configuration is not available in EDOT Browser.

## EDOT configuration details

This section includes additional details on some configuration settings that merit more explanation, or that have behavior that differs in EDOT Node.js when compared to OpenTelemetry JS.

### `instrumentations['document-load']` details [instrumentations-document-load]

This property holds the configuration options of [`@opentelemetry/instrumentation-document-load`](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-document-load#document-load-instrumentation-options).

### `instrumentations['fetch']` details [instrumentations-fetch]

This property holds the configuration options of [`@opentelemetry/instrumentation-fetch`](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-fetch#fetch-instrumentation-options).

### `instrumentations['long-task']` details [instrumentations-long-task]

This property holds the configuration options of [`@opentelemetry/instrumentation-long-task`](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-long-task#longtask-instrumentation-options).

### `instrumentations['xml-http-request']` details [instrumentations-xml-http-request]

This property holds the configuration options of [`@opentelemetry/instrumentation-xml-http-request`](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-xml-http-request#xhr-instrumentation-options).


### `instrumentations['web-exception']` details [instrumentations-web-exception]

This property holds the configuration options of [`@opentelemetry/instrumentation-web-exception`](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-web-exception#configuration).


### `instrumentations['web-vitals']` details [instrumentations-web-vitals]

This property holds the configuration options of [`@opentelemetry/instrumentation-web-vitals`](https://github.com/open-telemetry/opentelemetry-browser/tree/main/packages/instrumentation-web-vitals#configuration).
