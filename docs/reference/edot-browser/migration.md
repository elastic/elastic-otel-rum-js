---
navigation_title: Migration
description: Migrate from the Elastic Application Performance Monitoring (APM) Real User Monitoring (RUM) JavaScript agent to EDOT Browser.
type: how-to
applies_to:
  stack:
  serverless:
    observability:
  product:
    edot_browser: ga 1.0.0
products:
  - id: cloud-serverless
  - id: observability
  - id: edot-sdk
  - id: apm-agent
---

# Migrate to EDOT Browser from the Elastic {{product.apm}} RUM JavaScript agent

EDOT Browser collects browser telemetry with OpenTelemetry and exports it on the same ingest path as the rest of your OpenTelemetry data. Replacing the classic Real User Monitoring (RUM) agent (`@elastic/apm-rum`) with EDOT Browser (`@elastic/opentelemetry-browser`) puts frontend traces and logs on that path.

Moving to EDOT Browser changes more than the package name. There are several key differences:

- **Ingest path**: The classic RUM agent sends data to {{product.apm-server}}. EDOT Browser exports data using the OpenTelemetry Protocol (OTLP) through a reverse proxy.
- **Data model**: The classic RUM agent reports transactions, spans, and errors. EDOT Browser reports spans and log records that follow the OpenTelemetry semantic conventions.
- **Configuration and API**: EDOT Browser has its own configuration options, and you create custom spans and log records with the OpenTelemetry API instead of the classic agent API.

## Before you begin [before-you-begin]

EDOT Browser is a technical preview. For production real user monitoring, keep the classic RUM agent.

There is no automated migration tooling. You replace the agent, the initialization code, and the queries that read classic RUM data.

Confirm the following before you replace the agent:

- You have an OTLP ingest endpoint. Refer to the [prerequisites](setup.md#prerequisites) for the supported options.
- You can run a reverse proxy in front of that endpoint. The proxy adds the API key so the key stays off the browser. Refer to [Proxy and CORS configuration](proxy-cors.md).
- The browsers your application supports are on the [supported browsers](supported-technologies.md#supported-browsers) list. EDOT Browser targets ECMAScript 2022.
- EDOT Browser covers the classic RUM agent features you use. Refer to [Limitations](#limitations).

## Migration steps [migration-steps]

Follow these steps to migrate from the classic RUM agent to EDOT Browser.

:::::::{stepper}

::::::{step} Set up the OTLP ingest path

The classic RUM agent sends data to the {{product.apm-server}} RUM endpoint. EDOT Browser exports traces and logs to a reverse proxy that you run. The proxy forwards the data to the {{motlp}} or to {{product.elastic-agent}} configured as an OpenTelemetry Collector. The proxy adds the API key, so the key stays off the browser.

1. Make sure you have an OTLP ingest endpoint. Refer to the [prerequisites](setup.md#prerequisites) for the supported options.
2. Set up the reverse proxy and its Cross-Origin Resource Sharing (CORS) headers. Refer to [Proxy and CORS configuration](proxy-cors.md) for the requirements and an NGINX example.
3. If your site uses a Content Security Policy, replace the {{product.apm-server}} URL in the `connect-src` directive with the URL of the reverse proxy.

Confirm that the browser can reach the proxy URL before you replace the agent.
::::::

::::::{step} Replace the agent

Don't run both agents on the same page. Using multiple agents concurrently can cause conflicting instrumentation and duplicate telemetry.

:::::{tab-set}

::::{tab-item} Package

Remove the classic RUM agent and install EDOT Browser:

```bash
npm uninstall @elastic/apm-rum
npm install @elastic/opentelemetry-browser
```

If you use a framework integration (`@elastic/apm-rum-react`, `@elastic/apm-rum-angular`, or `@elastic/apm-rum-vue`), remove that package too. EDOT Browser has no framework integrations. Refer to [Framework integrations](#framework-integrations) for what changes.
::::

::::{tab-item} Script tag

Replace the classic agent script and the `elasticApm.init()` call with the EDOT Browser bundle and `startBrowserSdk()`:

```html
<script src="https://unpkg.com/@elastic/opentelemetry-browser/build/elastic-otel-browser.min.js" crossorigin></script>
<script>
  startBrowserSdk({
    serviceName: 'my-web-app',
    exportConfig: {
      url: 'https://telemetry.example.com'
    }
  });
</script>
```

Refer to [Install using the bundle](install-agent.md#install-bundle) for the asynchronous loading pattern.
::::

:::::
::::::

::::::{step} Replace the initialization code and configuration

Replace the `init()` call from `@elastic/apm-rum` with `startBrowserSdk()`. The following example shows a classic RUM agent setup:

```js
import { init as initApm } from '@elastic/apm-rum';

const apm = initApm({
  serviceName: 'my-web-app',
  serviceVersion: '1.2.0',
  serverUrl: 'https://apm.example.com',
  environment: 'production',
  transactionSampleRate: 0.5,
});
```

This is the same setup with EDOT Browser:

```js
import { startBrowserSdk } from '@elastic/opentelemetry-browser';

const sdk = startBrowserSdk({
  serviceName: 'my-web-app',
  serviceVersion: '1.2.0',
  exportConfig: {
    url: 'https://telemetry.example.com', // <1>
  },
  resourceAttributes: {
    'deployment.environment.name': 'production',
  },
  session: {
    sampleRate: 0.5, // <2>
  },
});
```

1. The URL of your reverse proxy, not the {{product.apm-server}} URL.
2. Sampling applies to whole user sessions, not to individual transactions. It gates automatic traces and logs. Metrics that your application emits through the OpenTelemetry API are still exported.

Refer to the [configuration mapping](#configuration-mapping) for the equivalent of each classic RUM agent option.
::::::

::::::{step} Migrate manual instrumentation

If you use the classic agent API, for example, `apm.startTransaction()`, `apm.startSpan()`, or `apm.captureError()`, replace those calls with the OpenTelemetry API. Refer to the [API mapping](#api-mapping) for the equivalent of each method.
::::::

::::::{step} Update dashboards, alerts, and queries

EDOT Browser data uses different field names and data streams than classic RUM data, and some events move from transactions to log records. Refer to [Data model changes](#data-model-changes) to find out what to update.
::::::

::::::{step} Verify the migration

Load your application. Confirm that the browser console shows no errors from EDOT Browser, and that export requests reach your reverse proxy. Then open {{kib}} and check that your service, traces, and logs appear. Refer to [What to expect in {{kib}}](setup.md#what-to-expect-in-kibana) for where EDOT Browser data shows up.
::::::

:::::::

## Configuration mapping [configuration-mapping]

This section lists the classic RUM agent configuration options and their equivalent in EDOT Browser. Refer to [Configure EDOT Browser](configuration.md) for details on each EDOT Browser option.

### `serviceName` [migration-service-name]

The classic RUM agent [`serviceName`](apm-agent-rum-js://reference/configuration.md#service-name) option corresponds to the EDOT Browser `serviceName` option. Set it to a name that contains only letters, numbers, spaces, dashes, and underscores. If you don't set it, EDOT Browser uses `unknown_service:web`. That default includes a colon, which [`service.name`](opentelemetry://reference/compatibility/limitations.md#allowed-characters-in-service-names) in {{product.apm}} does not allow.

### `serviceVersion` [migration-service-version]

The classic RUM agent [`serviceVersion`](apm-agent-rum-js://reference/configuration.md#service-version) option corresponds to the EDOT Browser `serviceVersion` option.

### `serverUrl` [migration-server-url]

The classic RUM agent [`serverUrl`](apm-agent-rum-js://reference/configuration.md#server-url) option corresponds to the EDOT Browser `exportConfig.url` option. Set it to the base URL of your reverse proxy, without signal paths such as `/v1/traces`. Refer to [Export endpoint configuration](configuration.md#export-endpoint-configuration) for more details.

### `serverUrlPrefix` [migration-server-url-prefix]

The classic RUM agent [`serverUrlPrefix`](apm-agent-rum-js://reference/configuration.md#server-url-prefix) option changes the path of the intake requests. In EDOT Browser, set `exportConfig.tracesUrl` and `exportConfig.logsUrl` to the full URL for each signal. EDOT Browser uses these URLs as they are, without appending `/v1/traces` or `/v1/logs`, so your reverse proxy must route them to the matching OTLP paths.

### `environment` [migration-environment]

The classic RUM agent [`environment`](apm-agent-rum-js://reference/configuration.md#environment) option corresponds to the `deployment.environment.name` resource attribute. For example: `resourceAttributes: { 'deployment.environment.name': 'production' }`.

### `active` [migration-active]

The classic RUM agent [`active`](apm-agent-rum-js://reference/configuration.md#active) option corresponds to the EDOT Browser `disabled` option, with the opposite meaning. For example, replace `active: false` with `disabled: true`.

### `disableInstrumentations` [migration-disable-instrumentations]

The classic RUM agent [`disableInstrumentations`](apm-agent-rum-js://reference/configuration.md#disable-instrumentations) option corresponds to the EDOT Browser `disableInstrumentations` option, but the instrumentation keys are different:

| Classic RUM agent key | EDOT Browser keys |
|---|---|
| `page-load` | `document-load`, `navigation-timing`, `resource-timing` |
| `history` | `navigation` |
| `click`, `eventtarget` | `user-action` |
| `fetch` | `fetch` |
| `xmlhttprequest` | `xhr` |
| `error` | `errors` |

EDOT Browser also has separate keys for instrumentations that the classic RUM agent doesn't let you turn off individually, such as `web-vitals`. Refer to [`instrumentations` details](configuration.md#otel_browser_instrumentations-details) for the full list of keys.

### `logLevel` [migration-log-level]

The classic RUM agent [`logLevel`](apm-agent-rum-js://reference/configuration.md#log-level) option corresponds to the EDOT Browser `logLevel` option. The `debug`, `info`, `warn`, and `error` levels are the same. Replace `trace` with `verbose`. The default changes from `warn` to `info`.

### `transactionSampleRate` [migration-transaction-sample-rate]

The classic RUM agent [`transactionSampleRate`](apm-agent-rum-js://reference/configuration.md#transaction-sample-rate) option corresponds to the EDOT Browser `session.sampleRate` option. Both accept a value between `0` and `1`, but the sampling unit is different. The classic RUM agent samples each transaction, and EDOT Browser samples whole user sessions. EDOT Browser exports automatic traces and logs from a sampled session, and exports none of that telemetry from a session that is not sampled. Metrics that your application emits through the OpenTelemetry API are still exported. Refer to [Session sampling](configuration.md#otel_browser_session-sampling) for more details.

### `distributedTracingOrigins` [migration-distributed-tracing-origins]

Like the classic RUM agent, EDOT Browser adds trace context headers to same-origin requests only. To add them to cross-origin requests, the classic RUM agent uses [`distributedTracingOrigins`](apm-agent-rum-js://reference/configuration.md#distributed-tracing-origins). EDOT Browser has no stable option for this. You can set `propagateTraceHeaderCorsUrls` for the `fetch` and `xhr` instrumentations through the `instrumentations` option:

```js
startBrowserSdk({
  // ...
  instrumentations: {
    fetch: { propagateTraceHeaderCorsUrls: ['https://api.example.com'] },
    xhr: { propagateTraceHeaderCorsUrls: ['https://api.example.com'] },
  },
});
```

:::{warning}
The `instrumentations` option passes settings to the upstream OpenTelemetry instrumentations, and those settings can change between releases. Refer to [`instrumentations` details](configuration.md#otel_browser_instrumentations-details) before you rely on it.
:::

The backend must still accept the `traceparent` and `tracestate` headers in its CORS configuration, as with the classic RUM agent.

### `ignoreTransactions` [migration-ignore-transactions]

The classic RUM agent [`ignoreTransactions`](apm-agent-rum-js://reference/configuration.md#ignore-transactions) option matches transaction names. EDOT Browser has no transactions, so there's no direct equivalent. To stop collecting telemetry for specific requests, use the EDOT Browser `ignoreFetchUrls` option, which matches request URLs. Refer to [`ignoreFetchUrls` details](configuration.md#otel_browser_ignorefetchurls-details) for the matching rules.

### `monitorLongtasks` [migration-monitor-longtasks]

The classic RUM agent [`monitorLongtasks`](apm-agent-rum-js://reference/configuration.md#monitor-longtasks) option reports long tasks as spans. EDOT Browser reports long animation frames as `browser.long_animation_frame` log records in Chromium-based browsers. This is on by default. To turn it off, add `long-animation-frame` to `disableInstrumentations`.

### `apmRequest` [migration-apm-request]

The classic RUM agent [`apmRequest`](apm-agent-rum-js://reference/configuration.md#apm-request) option can change or reject requests to {{product.apm-server}}. In EDOT Browser, use `exportConfig.headers` to add headers to export requests. There's no hook to change or reject export requests in the browser. Apply that logic in your reverse proxy instead.

### Options without an equivalent [migration-options-without-equivalent]

The following classic RUM agent options have no equivalent in EDOT Browser:

| Classic RUM agent option | Notes |
|---|---|
| `instrument` | To turn off automatic instrumentation, list every instrumentation key in `disableInstrumentations`. |
| `apiVersion` | Not applicable. EDOT Browser exports data using OTLP. |
| `breakdownMetrics` | EDOT Browser does not export an OpenTelemetry metrics signal. Refer to [Metrics](telemetry.md#metrics). |
| `flushInterval`, `eventsLimit` | EDOT Browser batches telemetry before export and doesn't expose batching or throttling options. |
| `pageLoadTraceId`, `pageLoadParentId`, `pageLoadSpanId`, `pageLoadSampled` | The `documentLoad` span always starts a new trace. Refer to [Page load trace correlation](#page-load-trace-correlation). |
| `pageLoadTransactionName` | The page load is reported as a span named `documentLoad`. |
| `distributedTracing` | EDOT Browser has no option to turn off trace context propagation. To stop collecting fetch, XMLHttpRequest, and resource-timing data for specific URLs, use `ignoreFetchUrls`. Those requests are not instrumented, so EDOT Browser does not add trace headers to them either. |
| `propagateTracestate` | Not needed. EDOT Browser uses W3C Trace Context propagation. |
| `centralConfig` | Central configuration isn't available for EDOT Browser. |
| `sendCredentials` | No equivalent option. |
| `reportTransactionsWithoutSpans` | Not applicable. EDOT Browser doesn't report transactions. |

## API mapping [api-mapping]

EDOT Browser doesn't have its own tracing API. To create custom spans and log records, use the OpenTelemetry API.

If you install EDOT Browser as a package, add `@opentelemetry/api` to your application's dependencies and use it as you do with any OpenTelemetry SDK:

```js
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-web-app');

tracer.startActiveSpan('load-cart', (span) => {
  try {
    // Your code
  } finally {
    span.end();
  }
});
```

If you load EDOT Browser with a script tag, the bundle doesn't expose the OpenTelemetry API, so there's no supported way to create custom spans or log records. Use the package instead.

The following table lists the classic RUM agent API methods and their equivalent:

| Classic RUM agent API | EDOT Browser equivalent |
|---|---|
| [`apm.init()`](apm-agent-rum-js://reference/agent-api.md#apm-init) | `startBrowserSdk()` |
| [`apm.startTransaction()`](apm-agent-rum-js://reference/agent-api.md#apm-start-transaction), [`apm.startSpan()`](apm-agent-rum-js://reference/agent-api.md#apm-start-span) | Create spans with the OpenTelemetry Traces API, for example, `tracer.startActiveSpan()`. OpenTelemetry has no separate transaction concept. |
| [`apm.getCurrentTransaction()`](apm-agent-rum-js://reference/agent-api.md#get-current-transaction) | `trace.getActiveSpan()` from the OpenTelemetry API. |
| [`apm.captureError()`](apm-agent-rum-js://reference/agent-api.md#capture-error) | Uncaught errors and unhandled promise rejections are captured automatically. For errors that your code handles, call `span.recordException()` on a span you created, or emit a log record with the OpenTelemetry Logs API. |
| [`apm.addLabels()`](apm-agent-rum-js://reference/agent-api.md#apm-add-labels), [`apm.setCustomContext()`](apm-agent-rum-js://reference/agent-api.md#apm-set-custom-context) | For values that are known when the page loads, use the `resourceAttributes` option. For other values, set attributes on the spans and log records that you create. There's no method to add attributes to all telemetry after EDOT Browser starts. |
| [`apm.setUserContext()`](apm-agent-rum-js://reference/agent-api.md#apm-set-user-context) | Not available. |
| [`apm.addFilter()`](apm-agent-rum-js://reference/agent-api.md#apm-add-filter) | Not available. |
| [`apm.setInitialPageLoadName()`](apm-agent-rum-js://reference/agent-api.md#set-initial-page-load-name) | Not available. |
| [`apm.observe()`](apm-agent-rum-js://reference/agent-api.md#observe) | Not available for transaction events. EDOT Browser has `sdk.observe()` for session events only. Refer to [`session` details](configuration.md#otel_browser_session-details). |

## Data model changes [data-model-changes]

The classic RUM agent groups most telemetry into transactions. EDOT Browser uses a small number of spans and reports most browser events as log records. The following table shows where each type of classic RUM data ends up:

| Classic RUM agent | EDOT Browser |
|---|---|
| `page-load` transaction, with navigation timing and resource spans | A `documentLoad` span for the initial page load, and a `browser.navigation` log record. Navigation timing and resource timing are log records. |
| `route-change` transaction | `browser.navigation` log record |
| `user-interaction` transaction | `browser.user_action.click` log record |
| `http-request` transaction and `fetch` or `XMLHttpRequest` spans | One span for each `fetch` or `XMLHttpRequest` request |
| Errors | `exception` log records |
| Web vitals (for example, largest contentful paint (LCP), cumulative layout shift (CLS), and interaction to next paint (INP)), reported with the `page-load` transaction | Log records with the measurements in `browser.web_vital.*` attributes |
| Long task spans | `browser.long_animation_frame` log records (Chromium-based browsers) |
| User Timing (`performance.measure`) spans | Not captured |
| Breakdown metrics | Not available |

Other differences to plan for:

- **Trace structure**: User actions don't produce spans, so `fetch` and `XMLHttpRequest` spans aren't grouped under a click or a route change in the trace view. Refer to [Traces](telemetry.md#traces) for what EDOT Browser emits.
- **Field names and data streams**: OpenTelemetry-native data uses OpenTelemetry field names and is stored in different data streams than classic {{product.apm}} data. For example, labels move from `labels.*` to `attributes.*`. Refer to [Data model impact](docs-content://solutions/observability/get-started/opentelemetry/switch-to-otel.md#switch-to-otel-data-model) for the changes that affect your queries, dashboards, and alerts.
- **Sessions**: EDOT Browser groups telemetry into user sessions. For sampled sessions, it adds `session.id` and related attributes to spans and log records from automatic instrumentations. Refer to [Sessions](telemetry.md#sessions) for how sessions start, end, and are sampled.

## Limitations [limitations]

The following classic RUM agent features aren't available in EDOT Browser. Refer to [Limitations](index.md#limitations) in the EDOT Browser overview for limitations that aren't specific to migration.

### User Experience app [user-experience-app]

The {{kib}} **User Experience** app only shows data from the classic RUM agent. For dashboards that work with EDOT Browser data, install the RUM OpenTelemetry Assets integration. Refer to [What to expect in {{kib}}](setup.md#what-to-expect-in-kibana) for the requirements.

### Framework integrations [framework-integrations]

EDOT Browser has no equivalent of the classic RUM agent integrations for [React, Angular, and Vue](apm-agent-rum-js://reference/framework-specific-integrations.md). This has the following effects:

- Route changes are captured as `browser.navigation` log records that contain the URL. They aren't named after the route path declared in your application, and their duration isn't measured.
- Errors that a framework handles itself, without raising a browser `error` event, aren't captured automatically. Report them from your framework's error handler with the OpenTelemetry API.

### Source maps [source-maps]

EDOT Browser doesn't support [source maps](apm-agent-rum-js://reference/source-maps.md). Stack traces of errors in minified code aren't mapped back to your original source code.

### User context [user-context]

EDOT Browser has no equivalent of `apm.setUserContext()`, so you can't attach the user's ID, name, or email to all telemetry.

### Page load trace correlation [page-load-trace-correlation]

With the classic RUM agent, you make the page load part of the trace that your backend starts when it renders the page, by setting `pageLoadTraceId`, `pageLoadSpanId`, and `pageLoadSampled`. In EDOT Browser, the `documentLoad` span always starts a new trace, so the initial page load is not linked to the backend trace that serves the document. Requests that the page makes after that load, with `fetch` or `XMLHttpRequest`, stay linked to the backend traces that handle them.

### Configuration [configuration-limitations]

EDOT Browser has fewer stable configuration options than the classic RUM agent. Settings for individual instrumentations are only available through the `instrumentations` option, which isn't recommended because upstream settings can change between releases. Refer to [`instrumentations` details](configuration.md#otel_browser_instrumentations-details) for more details.

### Geolocation [geolocation]

Classic RUM data includes the location of the user's browser, which is derived from the client IP address when the data is ingested. EDOT Browser data doesn't include `client.ip` or `client.geo.*` fields.

### Browser support [browser-support]

EDOT Browser targets ECMAScript 2022 and supports recent versions of Chrome, Edge, Firefox, and Safari. If your application supports older browsers with the classic RUM agent, check the [supported browsers](supported-technologies.md#supported-browsers) before you migrate.

## Next steps [next-steps]

- Refer to [Configure EDOT Browser](configuration.md) for each EDOT Browser option.
- Refer to [Metrics, traces, and logs](telemetry.md) for the events EDOT Browser emits.
- If you encounter issues during migration, refer to [Troubleshooting](troubleshooting.md) for problems that are specific to EDOT Browser.
