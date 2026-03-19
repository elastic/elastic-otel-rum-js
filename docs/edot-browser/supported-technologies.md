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

# Supported technologies

This page lists supported browser versions, included instrumentations and their default behavior.

## Browser requirements

At a minimum, the runtime environment must support:

- ES2022 (the SDK bundle targets this version)
- The `fetch` API
- `Promise`
- The `Performance` and `PerformanceObserver` APIs

### Supported browsers [supported-browsers]

EDOT Browser is designed to run in modern evergreen browsers that meet these requirements. 

| Browser | Supported versions |
|----------|--------------------|
| Chrome   | 94+ |
| Edge     | 94+ |
| Firefox  | 93+ |
| Safari   | 15.4+ |

:::{note}
Internet Explorer is not supported.
:::

If your application targets older browsers, you might need to downlevel the code with a bundler and provide polyfills. EDOT Browser doesn't include built-in polyfills.

## Bundlers [bundlers]

When you install EDOT Browser as a package (refer to [Install the agent](install-agent.md)), you build your application with a JavaScript bundler. The following bundlers are supported:

| Bundler   | Notes |
|-----------|-------|
| Webpack 4 | Supported. Refer to this [sample configuration](https://github.com/elastic/elastic-otel-rum-js/blob/main/packages/opentelemetry-browser/test/bundle/webpack4/webpack.config.mjs) and adapt it to your setup. |
| Webpack 5 | Supported. Refer to this [sample configuration](https://github.com/elastic/elastic-otel-rum-js/blob/main/packages/opentelemetry-browser/test/bundle/webpack5/webpack.config.mjs) and adapt it to your setup. |
| Rollup    | Supported. Refer to this [sample configuration](https://github.com/elastic/elastic-otel-rum-js/blob/main/packages/opentelemetry-browser/test/bundle/rollup/rollup.config.js) and adapt it to your setup. |
| esbuild   | Supported. No plugins are required. Refer to the [example configuration](https://github.com/elastic/elastic-otel-rum-js/blob/55f0dec911286208a104e8282aa16665c0de68e4/packages/opentelemetry-browser/package.json#L42). |


## TypeScript versions

Usage of `@elastic/opentelemetry-browser` in TypeScript code requires:

- TypeScript 5.0.4 or later
- Using `"module": "node16"` or "nodenext" in "tsconfig.json" to get support for handling the "exports" entry in package.json. This is so entry points like `@opentelemetry/browser-instrumentation/experimental/web-vitals` can be used.



## Included instrumentations [included-instrumentations]

EDOT Browser bundles a curated set of OpenTelemetry JS instrumentations suitable for browser environments. This list is being reviewed and might change in future releases.

The following instrumentations are included and turned on by default. You can turn off any of them using `configInstrumentations` by setting `enabled: false` for the corresponding key when calling `startBrowserSdk`:

| Instrumentation | Package | On by default |
|-----------------|---------|----------------|
| Document load   | `@opentelemetry/instrumentation-document-load` | Yes |
| Fetch           | `@opentelemetry/instrumentation-fetch` | Yes |
| XMLHttpRequest  | `@opentelemetry/instrumentation-xml-http-request` | Yes |
| User interaction| `@opentelemetry/instrumentation-user-interaction` | Yes |
| Long tasks      | `@opentelemetry/instrumentation-long-task` | Yes |
| Web exception   | `@opentelemetry/instrumentation-web-exception` | Yes |

### Default behavior

By default, EDOT Browser:

- Initializes tracing
- Registers included instrumentations
- Configures an OTLP exporter
- Applies Elastic-specific defaults (for example, resource detection or attribute normalization)

<!-- TODO: document actual defaults once finalized -->

To turn off an instrumentation, pass `instrumentations` to `startBrowserSdk` with the instrumentation key and `{ enabled: false }` (for example, `instrumentations: { '@opentelemetry/instrumentation-long-task': { enabled: false } }`).

## Version compatibility [version-compatibility]

| Component | Version |
|----------|---------|
| OpenTelemetry JS API | ^1.9.0 |
| OpenTelemetry JS Trace SDK | ^2.2.0 |
| OpenTelemetry JS Metrics SDK | ^2.2.0 |
| OpenTelemetry JS Logs SDK | ^0.213.0 |

<!-- TODO: document compatibility matrix once versioning strategy is defined -->

## Known limitations [known-limitations]

For capabilities that are not yet available and per-signal limitations (metrics, traces, logs), refer to [Limitations](index.md#limitations) on the overview page and [Metrics, traces, and logs](telemetry.md).

## Next steps [next-steps]

- Refer to [Set up EDOT Browser](setup.md) and [Install the agent](install-agent.md) to get started.
- Refer to [Metrics, traces, and logs](telemetry.md) for what is emitted per signal and what is not yet supported.
- Review [Configuration](configuration.md) to customize behavior.
- Refer to [Known limitations](#known-limitations) above, [Troubleshooting](troubleshooting.md) for EDOT Browser–specific guidance, or [OpenTelemetry ingest troubleshooting](docs-content://troubleshoot/ingest/opentelemetry/index.md) for general OTLP ingest issues.