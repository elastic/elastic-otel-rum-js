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
  logLevel: 'info',
  exportConfig: {
    url: 'https://telemetry.example.com',
  }
});
```

- `serviceName` identifies the browser application in {{product.observability}}.
- `exportConfig.url` points to a reverse proxy, not directly to {{product.observability}}.
- `logLevel` controls diagnostic output in the browser console.

## Supported configuration settings [supported-configuration-settings]

Configuration is passed as an object to `startBrowserSdk`. The following options are supported:

| Option                | Type                     | Description |
|-----------------------|--------------------------|-------------|
| `serviceName`         | `string`                 | Logical name of the frontend service. Defaults to `unknown_service:web` if not set. |
| `serviceVersion`      | `string`                 | Version of the application. Optional. |
| `logLevel` | `"none" \| "error" \| "warn" \| "info" \| "debug" \| "verbose" \| "all"` | Diagnostic log level for the SDK internal logger. Defaults to `info`. Values are lowercase; the SDK accepts them case-insensitively. |
| `resourceAttributes`  | `Record<string, any>`    | Optional resource attributes to attach to telemetry. For example: `{ 'deployment.environment.name': 'production' }`. |
| `disabled`            | `boolean`                | If `true`, the SDK does not start. |
| `instrumentations`    | `Record<string, Object>` | Per-instrumentation config. Set `{ enabled: false }` for a key to turn off that instrumentation. Refer to [instrumentations details](#otel_browser_instrumentations-details) for more information. |
| `session`             | `{ sampleRate?: number; inactivityTimeout?: number; maxDuration?: number }` | Session tracking and session-level sampling. Refer to [session details](#otel_browser_session-details) for more information. |
| `exportConfig`    | `{ url?: string; headers?: Record<string, string>}` | Configuration for exporters of the different signals. |
| `exportConfig.url`    | `string` | Base URL of the OTLP export endpoint (reverse proxy). Do not include signal paths such as `/v1/traces`. Defaults to `http://localhost:4318`. |
| `exportConfig.headers`    | `Record<string, string>` | Headers to send with export requests. Defaults to `{}`. The reverse proxy typically injects `Authorization`; do not put API keys here in browser code. |


## Export endpoint configuration [export-endpoint-configuration]

Configure `exportConfig.url` to point to a server that accepts OTLP traffic. Use the base URL of the server only: do not include signal paths such as `/v1/traces`, `/v1/metrics`, or `/v1/logs`. The SDK appends these paths when exporting each signal.

For security reasons, Elastic recommends configuring a reverse proxy that forwards OTLP traffic to {{product.observability}}. Refer to [Proxy and CORS configuration](proxy-cors.md) for more details.

Use a service name that identifies your frontend application and doesn't contain special characters, so that data is correctly categorized in {{product.observability}}.

For details on reverse proxy and authorization, refer to [OpenTelemetry for Real User Monitoring (RUM)](docs-content://solutions/observability/applications/otel-rum.md).

## Logging and diagnostics [logging-and-diagnostics]

EDOT Browser uses the OpenTelemetry diagnostic logger.

To troubleshoot setup issues, increase the log level when calling `startBrowserSdk`:

```js
import { startBrowserSdk } from '@elastic/opentelemetry-browser';

startBrowserSdk({
  serviceName: 'my-web-app',
  logLevel: 'debug',
  exportConfig: {
    url: 'https://telemetry.example.com',
  }
});
```

Diagnostic logs are written to the browser console. For more information on using debug logging to troubleshoot issues, refer to [Enable debug logging for EDOT SDKs](docs-content://troubleshoot/ingest/opentelemetry/edot-sdks/enable-debug-logging.md) and [Enable debug logging](docs-content://troubleshoot/ingest/opentelemetry/edot-collector/enable-debug-logging.md) (Collector).

## EDOT configuration details

This section provides additional details about configuration settings that require further explanation or behave differently in EDOT Browser compared to OpenTelemetry JS.

### `instrumentations` details [otel_browser_instrumentations-details]

An object whose keys are the configuration keys of the available instrumentations in EDOT and whose values are the corresponding configuration objects. The scope name is the instrumentation identifier attached to exported telemetry.

The following keys are supported:

| Instrumentation   | Key                                              | Scope                                            | Configuration |
|-------------------|--------------------------------------------------|--------------------------------------------------|---------------|
| Navigation timing | `navigation-timing`                              | `@opentelemetry/browser-instrumentation/navigation-timing` | [Reference](https://github.com/open-telemetry/opentelemetry-browser/tree/main/packages/instrumentation#navigation-timing) |
| Resource timing   | `resource-timing`                              | `@opentelemetry/browser-instrumentation/resource-timing` | [Reference](https://github.com/open-telemetry/opentelemetry-browser/tree/main/packages/instrumentation#resource-timing) |
| Fetch             | `fetch`                                          | `@opentelemetry/browser-instrumentation/fetch`   | [Reference](https://github.com/open-telemetry/opentelemetry-browser/tree/main/packages/instrumentation#fetch) |
| User action       | `user-action`                                    | `@opentelemetry/browser-instrumentation/user-action`| [Reference](https://github.com/open-telemetry/opentelemetry-browser/tree/main/packages/instrumentation#user-action) |
| XMLHttpRequest    | `xhr`                                            | `@opentelemetry/browser-instrumentation/xhr`     | [Reference](https://github.com/open-telemetry/opentelemetry-browser/tree/main/packages/instrumentation#xhr-xmlhttprequest) |
| Errors            | `errors`                                         | `@opentelemetry/browser-instrumentation/errors`   | [Reference](https://github.com/open-telemetry/opentelemetry-browser/tree/main/packages/instrumentation#errors) |
| Web vitals        | `web-vitals`                                     | `@opentelemetry/browser-instrumentation/web-vitals` | [Reference](https://github.com/open-telemetry/opentelemetry-browser/blob/main/packages/instrumentation/README.md#web-vitals) |
| Navigation        | `navigation`                                     | `@opentelemetry/browser-instrumentation/navigation` | [Reference](https://github.com/open-telemetry/opentelemetry-browser/blob/main/packages/instrumentation/README.md#navigation) |

### `session` details [otel_browser_session-details]

EDOT Browser adds `session.id`, `session.previous_id` (after a session rotates), `session.sampling_rate`, and `browser.tab.id` attributes to spans and log records for **sampled** sessions. Refer to [Sessions](telemetry.md#sessions) for details.

| Option              | Type      | Description |
|---------------------|-----------|-------------|
| `sampleRate`        | `number`  | Fraction of sessions to record, in the range 0–1. Defaults to `1` (100%). The decision is made when a session starts and stays fixed until the session rotates. Invalid values log a warning and fall back to the default; out-of-range values are clamped. Values are truncated to four decimal places (minimum step 0.0001). At `0`, automatic RUM instrumentations are disabled for that session and the `session.start` log record is not emitted. |
| `inactivityTimeout` | `number`  | Seconds without telemetry after which the session ends. Defaults to `1800` (30 minutes). Must be between `300` (5 minutes) and `maxDuration`. |
| `maxDuration`       | `number`  | Maximum session length in seconds, regardless of activity. Defaults to `14400` (4 hours). Must be between `1800` (30 minutes) and `86400` (24 hours). |

Incorrect values for `inactivityTimeout` and `maxDuration` fall back to the default and out-of-range values are clamped to the closest limit. In both cases EDOT Browser logs a warning.

#### Session sampling [otel_browser_session-sampling]

Session sampling controls whether EDOT Browser exports automatic RUM telemetry (instrumentation spans and log records) for a given user session. The sampling rate is configured with `session.sampleRate`, not a top-level `sampleRate` option.

When a session is **sampled in**, all configured instrumentations run for that session until it ends or rotates. When a session is **sampled out**, EDOT Browser disables automatic instrumentations for that session so the browser does not collect spans or log records that would be dropped anyway.

To stop automatic RUM export while keeping session machinery active, set `session.sampleRate` to `0`. With `sampleRate: 0`, session state still exists client-side but automatic export is suppressed.

Metrics your application emits through the OpenTelemetry API are not gated by session sampling today. Refer to [Sessions](telemetry.md#sessions) for signal-specific behavior.

## Next steps [next-steps]

- Refer to [Install the agent](install-agent.md) and [Proxy and CORS](proxy-cors.md) for installation and proxy configuration.
- Refer to [Metrics, traces, and logs](telemetry.md) for what each signal emits and limitations.
- Review [Supported technologies](supported-technologies.md) for browser and instrumentation support.
- Refer to [Troubleshooting](troubleshooting.md) for EDOT Browser–specific issues, or [OpenTelemetry ingest troubleshooting](docs-content://troubleshoot/ingest/opentelemetry/index.md) for general OTLP ingest issues.
