# EDOT Browser

The Elastic Distribution of OpenTelemetry Browser (EDOT Browser) is a lightweight wrapper around the [OpenTelemetry SDK](https://opentelemetry.io/docs/languages/js) that makes it easy to get started using OpenTelemetry in your web applications, especially if you are using [Elastic Observability](https://www.elastic.co/observability) as your observability solution.

**See [the EDOT Browser docs](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/xxxxx) for details.**
Some direct links:

<!-- TODO: put the right URLs once we have them -->

* [Get started](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/xxxxx/setup)
* [Configuration](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/xxxxx/configuration)
* [Changelog / Release Notes](https://www.elastic.co/docs/release-notes/edot/sdks/xxxx)
* [Elastic Discuss forum](https://discuss.elastic.co/tags/c/observability/apm/58/rum) | [GitHub issue tracker](https://github.com/elastic/elastic-otel-rum-js/issues)

## How does EDOT Browser differ from the OpenTelemetry JS SDK?

EDOT Browser is very similar to the `@opentelemetry/auto-instrumentations-web` package from OpenTelemetry in its usage goal: a single-dependency that provides a simple path to zero-code instrumentation of web applications. In general, Elastic's goal is to contribute all SDK improvements upstream. That said, there are sometimes differences that are specific to Elastic (e.g. Elastic-authored additional instrumentations or specific configurations). Here is a concise list of differences:

- EDOT Browser, being a [distribution](https://opentelemetry.io/docs/concepts/distributions/) of the OpenTelemetry JS SDK, always adds the [`telemetry.distro.*`](https://opentelemetry.io/docs/specs/semconv/attributes-registry/telemetry/) resource attributes to identify itself.
- EDOT Browser defaults to [`OTEL_SEMCONV_STABILITY_OPT_IN=http`](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/) such that telemetry from the `@opentelemetry/instrumentation-http` package will use stable HTTP semantic conventions by default. Upstream OpenTelemetry JS has [a tracking issue for the migration to newer HTTP semantic conventions](https://github.com/open-telemetry/opentelemetry-js/issues/5646) in its instrumentations.
