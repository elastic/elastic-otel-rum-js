---
navigation_title: Install the agent
description: Install and initialize the EDOT Browser agent (package or bundle).
applies_to:
  stack: ga
  serverless:
    observability: ga
products:
  - id: cloud-serverless
  - id: observability
  - id: edot-sdk
---

# Install the agent

EDOT Browser is available in two distribution formats: a package for applications that use a bundler, and a prebuilt bundle you can load with a script tag.

:::{note}
The contrib instrumentations included in EDOT Browser are experimental. They may introduce breaking changes to configuration or APIs. Because of that, EDOT Browser uses a development version (`0.x`) and increments the minor version when instrumentations introduce breaking changes or when new features are added.
:::

## Package versus bundle [package-vs-bundle]

| Option | Best for | Trade-offs |
|--------|----------|------------|
| **Package** | Applications that use a bundler (for example, webpack, esbuild, or Rollup). | Uses your bundler, so EDOT is included in your application bundle, increasing its size. Provides type definitions, so your build step might catch breaking changes at compile time. |
| **Bundle** | Applications that don't use a bundler (a single JavaScript file loaded with a `<script>` tag). | Works out of the box with no build step and does not increase your application bundle size. You must manually check for breaking changes in the configuration. |

Before installing, consider [configuring a reverse proxy and CORS](proxy-cors.md) so the browser can export telemetry securely without exposing credentials.

## Install using the package [install-package]

Install EDOT Browser using your package manager:

```bash
npm install @elastic/opentelemetry-browser
```

When you use the package, your bundler includes the SDK and its instrumentations. You can control which instrumentations are enabled using configuration.

After installation, EDOT Browser is available in your codebase and can be initialized when your application starts. Start EDOT Browser before your application code to ensure all relevant APIs are instrumented. Otherwise, your application might create references to APIs before instrumentation is applied, preventing EDOT Browser from capturing activity.

Import and start EDOT Browser in your application's entry point:

```js
// Other app imports
import { startBrowserSdk } from '@elastic/opentelemetry-browser';

startBrowserSdk({
  serviceName: 'my-web-app',
  otlpEndpoint: 'https://telemetry.example.com', // Reverse proxy URL; do not include /v1/traces or other signal paths
});

// Your application bootstrap code
```

For supported bundlers and browser requirements, refer to [Supported technologies](supported-technologies.md).

## Install using the bundle [install-bundle]

The following example shows how to install and initialize the latest version using a public CDN:

```html
<!-- Place these scripts in the HTML <head>, preferably before any other script -->
<script src="https://unpkg.com/@elastic/opentelemetry-browser/build/elastic-otel-browser.min.js" crossorigin></script>
<script>
  startBrowserSdk({
    serviceName: 'my-web-app',
    otlpEndpoint: 'https://telemetry.example.com', // Reverse proxy URL; do not include /v1/traces or other signal paths
  });
</script>
```

The bundle works out of the box: just add a `<script>` tag and initialize the SDK. EDOT Browser starts synchronously, ensuring that instrumentations are initialized before any activity occurs. This may impact your application's load time.

To avoid blocking other resources, you can load the script asynchronously. In this case, the EDOT Browser bundle does not block resource loading, but it still blocks the browser’s `onload` event.

```html
<script>
  ;(function (d, s, c) {
    var j = d.createElement(s),
      t = d.getElementsByTagName(s)[0];

    j.src = 'https://unpkg.com/@elastic/opentelemetry-browser/build/elastic-otel-browser.min.js';
    j.onload = function () { startBrowserSdk(c); };
    t.parentNode.insertBefore(j, t);
  })(document, 'script', {
    serviceName: 'my-web-app',
    otlpEndpoint: 'https://telemetry.example.com'
  });
</script>
```
:::{note}
Although this is the recommended approach, be aware of the following limitation: because EDOT Browser is downloaded and initialized asynchronously, distributed tracing doesn't capture requests that occur before the agent is initialized.
:::

## Initialize EDOT Browser [initialize]

Initialize EDOT Browser as early as possible in your application lifecycle so it can capture initial page loads, user interactions, and network requests. Call `startBrowserSdk`:

- At the top of your application entry point
- In a framework-specific bootstrap location (for example, a React root component, Angular `main.ts`, or a Vue plugin)

Minimal example (package):

```js
import { startBrowserSdk } from '@elastic/opentelemetry-browser';

startBrowserSdk({
  serviceName: 'my-web-app',
  otlpEndpoint: 'https://telemetry.example.com', // reverse proxy URL; do not include /v1/traces or other signal paths
});
```

At a minimum, configure:

- `serviceName`: Identifies your frontend application in {{product.observability}}.
- `otlpEndpoint`: Must point to your reverse proxy (not directly to {{product.observability}}).

For all configuration options, refer to [Configure EDOT Browser](configuration.md).

## Verify setup [verify]

You have successfully set up EDOT Browser when the SDK loads without errors in the browser console and telemetry flows to your reverse proxy. To confirm data in {{product.observability}}, open {{kib}} and check for your service and traces. For what you see in the UI, refer to [What to expect in {{kib}}](setup.md#what-to-expect-in-kibana) in the setup guide.

## Next steps [next-steps]

- Refer to [Set up EDOT Browser](setup.md) for an overview and what to expect in {{kib}}.
- Refer to [Configure EDOT Browser](configuration.md) to customize behavior and defaults.
- Review [Supported technologies](supported-technologies.md) for browsers and instrumentations.
