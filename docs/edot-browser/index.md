---
navigation_title: EDOT Browser
description: Overview of the Elastic Distribution of OpenTelemetry Browser (EDOT Browser).
applies_to:
  stack: ga
  serverless:
    observability: ga
products:
  - id: cloud-serverless
  - id: observability
  - id: edot-sdk
---

# {{edot}} Browser

EDOT Browser is Elastic’s distribution of the OpenTelemetry Browser SDK. It provides a bundled, opinionated setup for collecting traces, metrics, and logs from real user interactions in web applications and exporting that data to {{product.observability}} using the OpenTelemetry Protocol (OTLP).

:::{important}
EDOT Browser is released as a tech preview. The stack and serverless products referred to in this doc are GA and compatible with EDOT Browser.
:::

EDOT Browser is intended for Real User Monitoring (RUM) use cases, where telemetry is collected directly from users’ browsers to understand frontend performance, user interactions, and end-to-end request flows between frontend and backend services. It is based on OpenTelemetry standards and aims to align with contrib OpenTelemetry behavior.

EDOT Browser collects the following signals:

- **Traces**: For distributed tracing and frontend-to-backend correlation
- **Metrics**: Browser-side performance and runtime metrics
- **Logs**: Using the OpenTelemetry Logs API

For what each signal includes, known limitations, and what is not yet supported, refer to [Metrics, traces, and logs](telemetry.md).

## How it works [how-it-works]

EDOT Browser runs in the user's browser as part of your web application. When initialized, it instruments the page and captures telemetry such as document load, user interactions, network requests, and Core Web Vitals. For a full list of what is collected, refer to [Supported technologies](supported-technologies.md).

Data is exported using the OpenTelemetry Protocol (OTLP) over HTTP to an endpoint you configure. Because the SDK runs in the browser, it is recommended to avoid holding credentials there. The recommended approach is to place a reverse proxy that adds API keys or other auth headers before sending data to {{product.observability}} or an OpenTelemetry Collector. For details, refer to [Proxy and CORS configuration](proxy-cors.md).

In {{product.observability}}, you see `external.http` spans for browser fetch and XHR requests, user interaction spans (such as click, submit) that group related frontend and backend activity, and end-to-end traces from the browser to your backend in Discover and Service Maps. For details, refer to [What to expect in {{kib}}](setup.md#what-to-expect-in-kibana) in the setup guide.

:::{note}
Avoid using EDOT Browser alongside any other {{product.apm}} or RUM agent (including classic Elastic {{product.apm}} browser agents). Running multiple agents can cause conflicting instrumentation, duplicate telemetry, or unexpected behavior.
:::

## Limitations [limitations]

The following capabilities are not currently available in EDOT Browser:

- Full feature parity with classic Elastic {{product.apm}} browser agents
- Migration tooling from classic agents

## Browser telemetry and authentication [browser-telemetry-and-authentication]

Because EDOT Browser runs in the user’s browser, it cannot safely embed authentication credentials such as API keys. You can export telemetry directly to an OTLP endpoint if you set the appropriate headers (for example `Authorization`). For security, Elastic recommends placing a reverse proxy between the browser and your OTLP endpoint ({{ecloud}} Managed OTLP or an EDOT Collector). A reverse proxy is recommended for the following reasons:

- **Authentication**: The EDOT Collector or Managed OTLP endpoint expects an `Authorization` header with an API key. The reverse proxy injects the header so the key stays on the server and isn't exposed.
- **Cross-origin requests**: Your web application and the OTLP endpoint often have different origins. Browsers enforce Cross-Origin Resource Sharing (CORS), meaning that without the right headers, export requests are blocked. A reverse proxy on the same origin as your app (or configured to allow it) can add the required CORS headers and handle preflight `OPTIONS` requests.
- **Traffic control**: You can apply rate limiting or other controls at the proxy before traffic reaches the Collector or {{product.observability}}.

For reverse proxy and CORS configuration, refer to [Proxy and CORS](proxy-cors.md). For installation and initialization, refer to [Set up EDOT Browser](setup.md) and [Install the agent](install-agent.md).

## Next steps [next-steps]

To get started with EDOT Browser:

- Follow the setup instructions in [Set up EDOT Browser](setup.md): [Install the agent](install-agent.md) and [Configure proxy and CORS](proxy-cors.md)
- Review configuration options in [Configure EDOT Browser](configuration.md)
- Refer to [Supported technologies](supported-technologies.md) for details on browsers and instrumentations
- If telemetry does not appear, refer to [Troubleshooting](troubleshooting.md)
