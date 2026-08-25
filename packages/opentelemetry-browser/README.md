# EDOT Browser

The Elastic Distribution of OpenTelemetry Browser (EDOT Browser) is a lightweight wrapper around the [OpenTelemetry SDK](https://opentelemetry.io/docs/languages/js) that makes it easy to get started using OpenTelemetry in your web applications, especially if you are using [Elastic Observability](https://www.elastic.co/observability) as your observability solution.

**See [the EDOT Browser docs](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser) for details.**
Some direct links:

* [Get started](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser/setup)
* [Configuration](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser/configuration)
* [Changelog / Release Notes](https://www.elastic.co/docs/release-notes/edot/sdks/rum)
* [Elastic Discuss forum](https://discuss.elastic.co/tags/c/observability/apm/58/rum) | [GitHub issue tracker](https://github.com/elastic/elastic-otel-rum-js/issues)

## How does EDOT Browser differ from the OpenTelemetry JS SDK?

EDOT Browser is very similar to the `@opentelemetry/auto-instrumentations-web` package from OpenTelemetry in its usage goal: a single-dependency that provides a simple path to zero-code instrumentation of web applications. In general, Elastic's goal is to contribute all SDK improvements upstream. That said, there are sometimes differences that are specific to Elastic (e.g. Elastic-authored additional instrumentations or specific configurations). Here is a concise list of differences:

- EDOT Browser, being a [distribution](https://opentelemetry.io/docs/concepts/distributions/) of the OpenTelemetry JS SDK, always adds the [`telemetry.distro.*`](https://opentelemetry.io/docs/specs/semconv/attributes-registry/telemetry/) resource attributes to identify itself.

- EDOT Browser defaults to [`OTEL_SEMCONV_STABILITY_OPT_IN=http`](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/) such that telemetry from the `@opentelemetry/instrumentation-fetch` and `@opentelemetry/instrumentation-xml-http-request` package will use stable HTTP semantic conventions by default. Upstream OpenTelemetry JS has [a tracking issue for the migration to newer HTTP semantic conventions](https://github.com/open-telemetry/opentelemetry-js/issues/5646) in its instrumentations.

## Experimental: session replay (POC)

> **Experimental / not GA.** Session replay POC — not for production use.

Opt in via `startBrowserSdk({ replay: { enabled: true } })`. When enabled, the SDK dynamically loads [`@rrweb/record`](https://www.npmjs.com/package/@rrweb/record) and exports DOM recording events as OTLP logs with instrumentation scope `elastic-rrweb`.

```js
import { startBrowserSdk } from '@elastic/opentelemetry-browser';

const sdk = startBrowserSdk({
  serviceName: 'my-app',
  otlpEndpoint: 'https://otlp-proxy.example',
  replay: {
    enabled: true,
    samplingRate: 10,
    errorSamplingRate: 100,
    privacy: { maskAllInputs: true },
  },
});

sdk.pauseReplay();
sdk.resumeReplay();
await sdk.forceFlush();
```

Route collector logs where `instrumentation_scope.name == "elastic-rrweb"` to a dedicated data stream (e.g. `logs-rum.replay-*` with LogsDB). Default script-tag builds keep `@rrweb/record` external; use `elastic-otel-browser-replay.min.js` (or a bundler that resolves the dynamic import) when enabling replay from a `<script>` tag.

