---
navigation_title: Troubleshooting
description: Troubleshoot EDOT Browser telemetry export and common issues.
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

# Troubleshooting EDOT Browser

If telemetry doesn't appear in {{product.observability}}, try the following:

- Confirm the `otlpEndpoint` option points to your reverse proxy (not directly to {{product.observability}}) and doesn't include signal paths like `/v1/traces`.
- Check the browser console for network errors or OpenTelemetry-related messages. Cross-Origin Resource Sharing (CORS) errors often mean the reverse proxy is not sending the right `Access-Control-Allow-Origin` or preflight response.
- Ensure the reverse proxy can reach your EDOT Collector or {{ecloud}} Managed OTLP endpoint. To do so, check proxy logs for connection or authorization failures.
- Ensure service name is set and doesn't contain special characters.
- Set `logLevel` to `debug` or `verbose` in the `startBrowserSdk` options to see detailed export and instrumentation output in the console.

If you use a Content Security Policy, ensure the proxy or OTLP endpoint domain is in the `connect-src` directive. For bundler or module resolution errors, refer to [OpenTelemetry for Real User Monitoring (RUM)](docs-content://solutions/observability/applications/otel-rum.md) and the general [OpenTelemetry ingest troubleshooting](docs-content://troubleshoot/ingest/opentelemetry/index.md) docs.

## Get in touch [get-in-touch]

If the troubleshooting steps above don't resolve your issue, you can reach the team through the [Elastic discuss forum](https://discuss.elastic.co/tags/c/observability/apm/58/rum) or by opening a GitHub issue. Use the following guidance to choose the right repo:

* **Open an issue in the [EDOT Browser repo](https://github.com/elastic/elastic-otel-rum-js/issues/new)** if the issue relates to:

  - EDOT Browser-specific behavior or configuration options (for example, `startBrowserSdk`, `otlpEndpoint`)
  - Elastic-specific defaults or signal configuration
  - EDOT Browser packaging or installation
  - Sending data to {{product.observability}}

* **Open an issue in the [contrib OpenTelemetry JS repo](https://github.com/open-telemetry/opentelemetry-js/issues/new) or [JS contrib repo](https://github.com/open-telemetry/opentelemetry-js-contrib/issues/new)** if the issue relates to:

  - A specific instrumentation (for example, `@opentelemetry/instrumentation-fetch`, `@opentelemetry/instrumentation-user-interaction`)
  - OpenTelemetry SDK core behavior
  - OpenTelemetry specification compliance

## Next steps [next-steps]

- Refer to [Known limitations](supported-technologies.md#known-limitations) for what is not yet supported.
- Refer to [Set up EDOT Browser](setup.md), [Install the agent](install-agent.md), and [Proxy and CORS](proxy-cors.md) for installation and proxy configuration.
- For general OTLP ingest issues, refer to [OpenTelemetry ingest troubleshooting](docs-content://troubleshoot/ingest/opentelemetry/index.md).
