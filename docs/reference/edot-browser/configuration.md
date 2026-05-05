---
navigation_title: Configuration
description: Configure the Elastic Distribution of OpenTelemetry Browser (EDOT Browser).
applies_to:
  stack: ga
  serverless:
    observability: ga
  product:
    edot_browser: preview
products:
  - id: cloud-serverless
  - id: observability
  - id: edot-sdk
---

# Configure EDOT Browser

This page explains how to configure EDOT Browser, which settings are supported, and what's required to start exporting browser telemetry.

EDOT Browser follows OpenTelemetry configuration conventions where possible. Like the upstream OpenTelemetry Browser SDK, it uses explicit configuration at initialization rather than environment variables, which are not available in the browser.

## Configuration model in the browser [configuration-model-in-the-browser]

EDOT Browser runs in your users' browsers. Configuration passed to EDOT Browser is accessible to end users, since browser source code and runtime values are visible. This is why you shouldn't embed secrets such as API keys in browser configuration.

Environment variables exist at build time only: a bundler replaces `process.env.*` with values when bundling, but these values are not available at runtime in the browser. You can provide configuration at build time (bundler-defined constants) or at runtime (options passed to the initialization function).

EDOT Browser does not read `OTEL_*` variables directly. Instead, it accepts configuration values passed explicitly during initialization.

### Common configuration patterns

Typical configuration patterns include:

- Passing configuration from a server-rendered page.
- Loading configuration from a global object populated at runtime.

The best approach depends on your application architecture and build tooling.

## Minimal required configuration [minimal-required-configuration]

At a minimum, EDOT Browser requires:

- A service name to identify the frontend application.
- An export endpoint that points to a reverse proxy.

You can also set a log level, which is recommended during setup.

```js
import { startBrowserSdk } from '@elastic/opentelemetry-browser';

startBrowserSdk({
  serviceName: 'my-web-app',
  otlpEndpoint: 'https://telemetry.example.com',
  logLevel: 'info',
});
```

- `serviceName` identifies the browser application in {{product.observability}}.
- `otlpEndpoint` points to a reverse proxy, not directly to {{product.observability}}.
- `logLevel` controls diagnostic output in the browser console.

## Supported configuration settings [supported-configuration-settings]

Configuration is passed as an object to `startBrowserSdk`. The following options are supported:

| Option                | Type                     | Description |
|-----------------------|--------------------------|-------------|
| `serviceName`         | `string`                 | Logical name of the frontend service. Defaults to `unknown_service:web` if not set. |
| `serviceVersion`      | `string`                 | Version of the application. Optional. |
| `logLevel`            | `string`                 | Diagnostic log level (`error`, `warn`, `info`, `debug`, `verbose`). Defaults to `info`. |
| `otlpEndpoint`        | `string`                 | Base URL of the OTLP export endpoint (reverse proxy). Do not include signal paths such as `/v1/traces`. Defaults to `http://localhost:4318`. |
| `sampleRate`          | `number`                 | Trace sampling ratio (0–1). Defaults to `1` (100%). |
| `resourceAttributes`  | `Record<string, any>`    | Optional resource attributes to attach to telemetry. For example: `{ 'deployment.environment.name': 'production' }`. |
| `exportHeaders`       | `Record<string, string>` | Headers to send with export requests. Defaults to `{}`. The reverse proxy typically injects `Authorization`; do not put API keys here in browser code. |
| `disabled`            | `boolean`                | If `true`, the SDK does not start. |
| `instrumentations`    | `Record<string, Object>` | Per-instrumentation config. Set `{ enabled: false }` for a key to turn off that instrumentation. Refer to [instrumentations details](#otel_browser_instrumentations-details) for more information. |

## Export endpoint configuration [export-endpoint-configuration]

Configure `otlpEndpoint` to point to a server that accepts OTLP traffic. Use the base URL of the server only: do not include signal paths such as `/v1/traces`, `/v1/metrics`, or `/v1/logs`. The SDK appends these paths when exporting each signal.

For security reasons Elastic recommends to configure a reverse proxy that forwards OTLP traffic to {{product.observability}}. Refer to [Proxy and CORS configuration](proxy-cors.md) for more details.

Use a service name that identifies your frontend application and doesn't contain special characters, so that data is correctly categorized in {{product.observability}}.

For details on reverse proxy and authorization, refer to [OpenTelemetry for Real User Monitoring (RUM)](docs-content://solutions/observability/applications/otel-rum.md).

## Logging and diagnostics [logging-and-diagnostics]

EDOT Browser uses the OpenTelemetry diagnostic logger.

To troubleshoot setup issues, increase the log level when calling `startBrowserSdk`:

```js
import { startBrowserSdk } from '@elastic/opentelemetry-browser';

startBrowserSdk({
  serviceName: 'my-web-app',
  otlpEndpoint: 'https://telemetry.example.com',
  logLevel: 'debug',
});
```

Diagnostic logs are written to the browser console. For more information on using debug logging to troubleshoot issues, refer to [Enable debug logging for EDOT SDKs](docs-content://troubleshoot/ingest/opentelemetry/edot-sdks/enable-debug-logging.md) and [Enable debug logging](docs-content://troubleshoot/ingest/opentelemetry/edot-collector/enable-debug-logging.md) (Collector).

## EDOT configuration details

This section provides additional details about configuration settings that require further explanation or behave differently in EDOT Browser compared to OpenTelemetry JS.

### `instrumentations` details [otel_browser_instrumentations-details]

An object whose keys are the scope names of the available instrumentations in EDOT and whose values are the corresponding configuration objects.

The following keys are supported:

| Instrumentation   | Key (scope name)                                 | Configuration |
|-------------------|--------------------------------------------------|---------------|
| Document load     | `@opentelemetry/instrumentation-document-load`   | [Reference](https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/instrumentation-document-load/README.md#document-load-instrumentation-options) |
| Fetch             | `@opentelemetry/instrumentation-fetch`           | [Reference](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-fetch#fetch-instrumentation-options) |
| Long task         | `@opentelemetry/instrumentation-long-task`       | [Reference](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-long-task#longtask-instrumentation-options) |
| User interaction  | `@opentelemetry/instrumentation-user-interaction`| [Reference](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-user-interaction#send-spans-for-different-events) |
| XMLHttpRequest    | `@opentelemetry/instrumentation-xml-http-request`| [Reference](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-xml-http-request#xhr-instrumentation-options) |
| Web exception     | `@opentelemetry/instrumentation-web-exception`   | [Reference](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-web-exception#configuration) |
| Web vitals        | `@opentelemetry/instrumentation-web-vitals`      | [Reference](https://github.com/open-telemetry/opentelemetry-browser/blob/main/packages/instrumentation/README.md#configuration-1) |

## Next steps [next-steps]

- Refer to [Install the agent](install-agent.md) and [Proxy and CORS](proxy-cors.md) for installation and proxy configuration.
- Refer to [Metrics, traces, and logs](telemetry.md) for what each signal emits and limitations.
- Review [Supported technologies](supported-technologies.md) for browser and instrumentation support.
- Refer to [Troubleshooting](troubleshooting.md) for EDOT Browser–specific issues, or [OpenTelemetry ingest troubleshooting](docs-content://troubleshoot/ingest/opentelemetry/index.md) for general OTLP ingest issues.
