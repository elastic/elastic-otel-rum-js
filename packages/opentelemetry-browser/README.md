# EDOT Browser

The Elastic Distribution of OpenTelemetry Browser (EDOT Browser) is a lightweight wrapper around the [OpenTelemetry SDK](https://opentelemetry.io/docs/languages/js) that makes it easy to get started using OpenTelemetry in your web applications, especially if you are using [Elastic Observability](https://www.elastic.co/observability) as your observability solution.

**See [the EDOT Browser docs](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser) for details.**
Some direct links:

* [Get started](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser/setup)
* [Configuration](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser/configuration)
* [Changelog / Release Notes](https://www.elastic.co/docs/release-notes/edot/sdks/rum)
* [Elastic Discuss forum](https://discuss.elastic.co/tags/c/observability/apm/58/rum) | [GitHub issue tracker](https://github.com/elastic/elastic-otel-rum-js/issues)

## How does EDOT Browser differ from the OpenTelemetry Browser SDK?

EDOT Browser wraps the packages in the [OpenTelemetry Browser](https://github.com/open-telemetry/opentelemetry-browser) repository—primarily `@opentelemetry/browser-sdk` and `@opentelemetry/browser-instrumentation`—with a single-call, RUM-focused `startBrowserSdk` and defaults tuned for Elastic Observability. In spirit it is similar in goal to one-dependency, zero-code browser instrumentation, including what older setups did with [`@opentelemetry/auto-instrumentations-web`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-web), but Elastic ships an opinionated distribution on top. Elastic aims to contribute improvements upstream where possible. Differences that are intentional for this distribution are listed below:

- EDOT Browser, being a [distribution](https://opentelemetry.io/docs/concepts/distributions/) of the OpenTelemetry JS SDK, always adds the [`telemetry.distro.*`](https://opentelemetry.io/docs/specs/semconv/attributes-registry/telemetry/) resource attributes to identify itself.

- EDOT Browser detects additional browser resource attributes—such as `browser.name` and `browser.version` from user-agent parsing—alongside standard service metadata. Upstream’s optional `BrowserDetector` focuses on client-hints and user-agent fields without EDOT’s broader name/version parsing.

- EDOT Browser includes built-in session management by default that groups RUM telemetry into user sessions (including across tabs and page reloads), applies session-level sampling, and exposes session lifecycle APIs (`getSession`, `observe`, `endSession`). The [OpenTelemetry Browser SDK](https://github.com/open-telemetry/opentelemetry-browser) provides an optional [`@opentelemetry/browser-sdk/session`](https://github.com/open-telemetry/opentelemetry-browser/tree/main/packages/sdk/src/session) module that you compose manually; it focuses on `session.id` and does not include EDOT’s session sampling, tab attributes, or public session API. Refer to [session configuration](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser/configuration#otel_browser_session-details).

- EDOT Browser turns on nine browser RUM instrumentations by default (including `long-animation-frame` where the browser supports it); upstream requires you to register each instrumentation yourself. Use `disableInstrumentations` to opt out. Refer to [instrumentations](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser/configuration#otel_browser_instrumentations-details).

- EDOT Browser registers a built-in context manager that patches common asynchronous browser APIs (such as short `setTimeout` callbacks, `Promise` handlers, and `XMLHttpRequest` listeners) so trace context is carried across typical RUM async work. The default context manager in the [OpenTelemetry Browser SDK](https://github.com/open-telemetry/opentelemetry-browser) only stacks context for synchronous `with` calls unless you supply your own. Refer to [context manager](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser/telemetry#traces-context-manager).

- EDOT Browser ships ready-to-use browser bundles (`elastic-otel-browser.js` and a minified build) for script-tag or simple deployments. The upstream browser SDK is published as modules for bundlers only.
