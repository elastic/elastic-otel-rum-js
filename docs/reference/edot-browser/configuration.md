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
| `sampleRate`          | `number`                 | Trace sampling ratio (0–1). Defaults to `1` (100%). |
| `resourceAttributes`  | `Record<string, any>`    | Optional resource attributes to attach to telemetry. For example: `{ 'deployment.environment.name': 'production' }`. |
| `disabled`            | `boolean`                | If `true`, the SDK does not start. |
| `instrumentations`    | `Record<string, Object>` | Per-instrumentation config. Set `{ enabled: false }` for a key to turn off that instrumentation. Refer to [instrumentations details](#otel_browser_instrumentations-details) for more information. |
| `session`             | `{ enabled?: boolean; inactivityTimeout?: number; maxDuration?: number }` | Session tracking. Refer to [session details](#otel_browser_session-details) for more information. |
| `pageRoute`           | `((url: URL) => string \| undefined) \| false` | Function that returns the low-cardinality route of a page, added as `url.template` to spans and log records. Defaults to `inferPageRoute`. Set to `false` to only use routes passed to `setPageRoute`. Refer to [page route details](#otel_browser_page-route-details) for more information. |
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

EDOT Browser adds `session.id`, `session.previous_id` (after a session rotates), and `browser.tab.id` attributes to spans and log records. Refer to [Sessions](telemetry.md#sessions) for details.

| Option              | Type      | Description |
|---------------------|-----------|-------------|
| `enabled`           | `boolean` | Set to `false` to turn off session tracking. Defaults to `true`. |
| `inactivityTimeout` | `number`  | Seconds without telemetry after which the session ends. Defaults to `1800` (30 minutes). Must be between `300` (5 minutes) and `maxDuration`. |
| `maxDuration`       | `number`  | Maximum session length in seconds, regardless of activity. Defaults to `14400` (4 hours). Must be between `1800` (30 minutes) and `86400` (24 hours). |

Incorrect values fall back to the default and out-of-range values are clamped to the closest limit. In both cases EDOT Browser logs a warning.

### `pageRoute` details [otel_browser_page-route-details]

EDOT Browser adds a `url.template` attribute with the route of the current page (for example `/product/{id}`) to spans and log records. Refer to [Page routes](telemetry.md#page-routes) for details.

By default, EDOT Browser infers the route from the URL with `inferPageRoute`. It replaces ID-like path segments (numbers, UUIDs, hashes, and ULIDs) with `{id}`, drops the query string, and keeps the route of hash-based routers. For example, `/product/123?ref=ad` becomes `/product/{id}` and `/#/cart/42` becomes `/#/cart/{id}`.

Inferred routes keep other path segments as they are, so URLs with slugs (for example `/blog/my-first-post`) still produce one route per page. To control the routes, set `pageRoute` to a function that receives the URL of the current page and returns its route, or `undefined` to omit the attribute. EDOT Browser calls it once per URL, including after in-page (SPA) navigations. You can fall back to `inferPageRoute` for URLs you don't handle:

```js
import { inferPageRoute, startBrowserSdk } from '@elastic/opentelemetry-browser';

startBrowserSdk({
  serviceName: 'my-web-app',
  pageRoute: (url) =>
    url.pathname.startsWith('/blog/') ? '/blog/{slug}' : inferPageRoute(url),
});
```

Set `pageRoute` to `false` to stop inferring routes. Only routes passed to `setPageRoute` are added then.

Routers already know the route of the current page. Pass it with `setPageRoute` after the router updates the URL, for example in an after-navigation hook. The route applies until the page path or hash route changes, and takes precedence over `pageRoute`. Passing `undefined` falls back to `pageRoute`:

```js
import { setPageRoute } from '@elastic/opentelemetry-browser';

router.afterEach((to) => setPageRoute(to.matched.at(-1)?.path));
```

When you load EDOT Browser from a `<script>` tag, `setPageRoute` and `inferPageRoute` are available as globals.

## Next steps [next-steps]

- Refer to [Install the agent](install-agent.md) and [Proxy and CORS](proxy-cors.md) for installation and proxy configuration.
- Refer to [Metrics, traces, and logs](telemetry.md) for what each signal emits and limitations.
- Review [Supported technologies](supported-technologies.md) for browser and instrumentation support.
- Refer to [Troubleshooting](troubleshooting.md) for EDOT Browser–specific issues, or [OpenTelemetry ingest troubleshooting](docs-content://troubleshoot/ingest/opentelemetry/index.md) for general OTLP ingest issues.
