---
navigation_title: Configuration
description: Configure the Elastic Distribution of OpenTelemetry Browser (EDOT Browser).
applies_to:
  stack:
  serverless:
    observability:
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

:::{important}
In 0.4 and later, several configuration keys changed to align with the upstream OpenTelemetry Browser SDK. For example, `otlpEndpoint` and `exportHeaders` moved to `exportConfig.url` and `exportConfig.headers`, the top-level `sampleRate` option moved to `session.sampleRate`, and instrumentation keys use short names such as `fetch` and `user-action`. If you're upgrading, refer to [EDOT Browser breaking changes](../../release-notes/breaking-changes.md) for the full list of changes and migration steps.
:::

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
| `instrumentations`    | `Record<string, Object>` | **Not recommended.** Advanced per-instrumentation config passed through to upstream OpenTelemetry Browser instrumentations. EDOT Browser logs a warning when this option is set. Refer to [instrumentations details](#otel_browser_instrumentations-details). |
| `disableInstrumentations` | `string[]`            | Optional list of instrumentation keys to turn off. Values must match the keys in [instrumentations details](#otel_browser_instrumentations-details). Refer to [`disableInstrumentations` details](#otel_browser_disableinstrumentations-details). |
| `session`             | `{ sampleRate?: number; inactivityTimeout?: number; maxDuration?: number }` | Session tracking and session-level sampling. Refer to [session details](#otel_browser_session-details) for more information. |
| `ignoreFetchUrls`     | `(string \| RegExp)[]`   | URLs to exclude from fetch, XMLHttpRequest, and resource timing instrumentation. OTLP export URLs are always ignored. Refer to [`ignoreFetchUrls` details](#otel_browser_ignorefetchurls-details). Optional; defaults to `[]`. |
| `exportConfig`    | `{ url?: string; tracesUrl?: string; logsUrl?: string; headers?: Record<string, string>}` | Configuration for exporters of the different signals. |
| `exportConfig.url`    | `string` | Base URL of the OTLP export endpoint (reverse proxy). Do not include signal paths such as `/v1/traces`. Defaults to `http://localhost:4318`. |
| `exportConfig.tracesUrl`, `exportConfig.logsUrl`    | `string` | Full URL for one signal, used as is without appending `/v1/<signal>`. Overrides `exportConfig.url` for that signal only. Optional. Refer to [Export endpoint configuration](#export-endpoint-configuration). |
| `exportConfig.headers`    | `Record<string, string>` | Headers to send with export requests. Defaults to `{}`. The reverse proxy typically injects `Authorization`; do not put API keys here in browser code. |


## Export endpoint configuration [export-endpoint-configuration]

Configure `exportConfig.url` to point to a server that accepts OTLP traffic. Use the base URL of the server only: do not include signal paths such as `/v1/traces` or `/v1/logs`. The SDK appends these paths when exporting each signal.

If your server routes OTLP traffic on paths other than `/v1/traces` and `/v1/logs`, set `exportConfig.tracesUrl` or `exportConfig.logsUrl`. Each one is a full URL and is used exactly as written. A signal without its own URL still uses `exportConfig.url` plus the default path, and you can omit `exportConfig.url` when both are set.

```js
import { startBrowserSdk } from '@elastic/opentelemetry-browser';

startBrowserSdk({
  serviceName: 'my-web-app',
  exportConfig: {
    tracesUrl: 'https://telemetry.example.com/otlp/t',
    logsUrl: 'https://telemetry.example.com/otlp/l',
  },
});
```

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

:::{warning}
Using `instrumentations` is not recommended for most applications. EDOT Browser aims to provide a stable configuration surface, but the upstream OpenTelemetry Browser instrumentations are still in active development and their configuration can change in ways that break your initialization options on upgrade.

If you set `instrumentations`, EDOT Browser prints a warning in the browser console to remind you that this option is unstable and that future EDOT or instrumentation updates may require changes on your side. For advanced use only, review the `@opentelemetry/browser-instrumentation` version bundled with your EDOT Browser release when you upgrade. Stable, EDOT-specific options for common instrumentation settings are planned separately from this passthrough. For background, refer to [elastic-otel-rum-js#152](https://github.com/elastic/elastic-otel-rum-js/issues/152).
:::

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

### `disableInstrumentations` details [otel_browser_disableinstrumentations-details]

Pass an array of instrumentation keys (the same strings as the **Key** column in the table above) to turn off specific instrumentations without using the `instrumentations` object. This option is intended for simple cases such as disabling one or two defaults.

- The value must be an array of strings. Other shapes log a warning in the browser console and are ignored.
- If a string is not a known instrumentation key, EDOT Browser logs a warning and skips that entry.
- If you set both `disableInstrumentations` and `instrumentations` for the same key, `disableInstrumentations` takes precedence. For example, `disableInstrumentations: ['resource-timing']` keeps resource timing disabled even when you also pass other configuration under `instrumentations['resource-timing']`.

```js
import { startBrowserSdk } from '@elastic/opentelemetry-browser';

startBrowserSdk({
  serviceName: 'my-web-app',
  exportConfig: {
    url: 'https://telemetry.example.com',
  },
  disableInstrumentations: ['web-vitals', 'resource-timing'],
});
```

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

When an active session is available, traces and logs use that session's sampling decision. If the session manager cannot return an active session—for example after a session expires and before user activity starts a new one—there is no per-session decision to apply. When `session.sampleRate` is `1` (the default), the trace sampler still **samples spans in** and automatic log records continue to be exported. For any rate below `1`, spans are sampled out until a new session starts.

To stop automatic RUM export while keeping session machinery active, set `session.sampleRate` to `0`. With `sampleRate: 0`, session state still exists client-side but automatic export is suppressed.

Metrics your application emits through the OpenTelemetry API are not gated by session sampling today. Refer to [Sessions](telemetry.md#sessions) for signal-specific behavior.

```js
import { startBrowserSdk } from '@elastic/opentelemetry-browser';

sdk.getSession(); // { id, previousId, startTimestamp, sampled }, or undefined when no session is active

const unsubscribe = sdk.addObserver({
  onSessionStarted(session, previous) {
    console.log('Session started', session.id, 'after', previous?.id);
  },
  onSessionEnded(session) {
    console.log('Session ended', session.id);
  },
});
```

Both callbacks are optional and run synchronously. The observer has the same shape as the upstream `@opentelemetry/browser-sdk/session` one.

- `onSessionEnded` is called when the session expires, when the application ends it with `endSession()`, when another tab replaces the session, and when `localStorage` is cleared. Expiry calls it even if the application produces no telemetry.
- `onSessionStarted` is called when this tab starts a session or adopts one started by another tab. `previous` is set only when this tab sees the preceding session end. Observers added after `startBrowserSdk` returns do not receive the initial session. Use `getSession()` to read it.
- Browsers throttle timers in background tabs, so `onSessionEnded` can be delayed until the tab is used again.

#### End a session [otel_browser_session-end]

Call `endSession()` to end the current session before it expires, for example when the user logs out, so the next user does not share the same `session.id`:

```js
function logout() {
  sdk.endSession();
  // ...
}
```

The session ends in every tab of the application and observers get `onSessionEnded`. As after an expiry, telemetry has no `session.id` until the next user interaction or page load starts a new session, which has the ended session as `session.previous_id`. Calling it when no session is active has no effect.

When web storage is unavailable or after `sdk.shutdown()`, `getSession()` returns `undefined`, and `addObserver()` and `endSession()` have no effect.

### `ignoreFetchUrls` details [otel_browser_ignorefetchurls-details]

`ignoreFetchUrls` lists URLs that EDOT Browser should not instrument. The SDK always ignores OTLP export URLs (traces, logs, and metrics) to prevent self-instrumentation. When you set `instrumentations`, per-instrumentation `ignoreUrls` values are merged with this list for fetch, XMLHttpRequest, and resource timing.

**Matching rules**

- **Strings** must exactly match the full absolute request URL, including scheme, host, path, and query string. A path-only value such as `/api/health` does not match.
- **`RegExp` values** are partial matches against the URL, consistent with upstream fetch and XHR `ignoreUrls`.

**What is suppressed**

- **Fetch and XHR:** ignored requests produce no spans and do not receive a `traceparent` header, so trace context is not propagated to those endpoints and downstream services are not linked from the browser trace.
- **Resource timing:** ignored URLs are filtered from resource timing log records for every resource type (scripts, stylesheets, images, fonts, and others), not only fetch and XHR. For example, ignoring a URL pattern that matches `analytics.js` also omits resource timing telemetry for that script load.

```js
import { startBrowserSdk } from '@elastic/opentelemetry-browser';

startBrowserSdk({
  serviceName: 'my-web-app',
  exportConfig: {
    url: 'https://telemetry.example.com',
  },
  ignoreFetchUrls: [
    // Exact match on the full URL
    'https://api.example.com/v1/internal/health?key=abc',
    // Partial match (RegExp)
    /https:\/\/analytics\.example\.net\//,
  ],
});
```

## Next steps [next-steps]

- Refer to [Install the agent](install-agent.md) and [Proxy and CORS](proxy-cors.md) for installation and proxy configuration.
- Refer to [Metrics, traces, and logs](telemetry.md) for what each signal emits and limitations.
- Review [Supported technologies](supported-technologies.md) for browser and instrumentation support.
- Refer to [Troubleshooting](troubleshooting.md) for EDOT Browser–specific issues, or [OpenTelemetry ingest troubleshooting](docs-content://troubleshoot/ingest/opentelemetry/index.md) for general OTLP ingest issues.
