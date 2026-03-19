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

EDOT Browser is distributed in two ways.

## Package versus bundle [package-vs-bundle]

:::{note}
Status of the upstream instrumentations included in EDOT Browser is experimental. This means they may introduce breaking changes in their configuration or APIs. For that reason EDOT Browser keeps a "development" version (`0.x` range) and will bump the minor when any of the instrumentations contain a breaking change or EDOT provides a new feature.
:::


| Option | Best for | Trade-offs |
|--------|----------|------------|
| **Package** | Applications that use a bundler (for example: webpack, esbuild, Rollup). | Uses your bundler so EDOT is shipped with your application code, making it bigger. It provides type definitions so your build step probably will catch breaking changes at the types level. |
| **Bundle** | Applications that don't use a bundler (single JS file loaded using script tag). | Works out of the box with no build step and does not increase your application size. You have to check manually for breaking changes in the configuration. |


Before installing, consider [configuring a reverse proxy and CORS](proxy-cors.md) so the browser can export telemetry securely without exposing credentials.

## Install using the package [install-package]

Install EDOT Browser using your package manager:

```bash
npm install @elastic/opentelemetry-browser
```

Then the EDOT is available to your codebase and can be initialized when your application starts. We recommend to start the EDOT Browser before you application code does. Otherwise it is possible your application keeps references to some APIs before being instrumented therefore the EDOT Browser won't be able to detect activity.

The entry point of your application should import and start EDOT.
```js
// Other app imports
import { startBrowserSdk } from '@elastic/opentelemetry-browser';

startBrowserSdk({
  serviceName: 'my-web-app',
  otlpEndpoint: 'https://telemetry.example.com', // reverse proxy URL; do not include /v1/traces or other signal paths
});

// you application bootstrap code
```

When you use the package, your bundler includes the SDK and its instrumentations. You can control which instrumentations are enabled using configuration.

For supported bundlers and browser requirements, refer to [Supported technologies](supported-technologies.md).

## Install using the bundle [install-bundle]

A single JS bundle is available for script-tag usage (for example, from a CDN or your own host). Use it when your application doesn't use a bundler.

The following example shows how to install and intialize the latest version using a public CDN. 

```html
<!-- Place these scripts in the HTML <head> section preferably before any other script -->
<script src="https://unpkg.com/@elastic/opentelemetry-browser/build/elastic-otel-browser.min.js" crossorigin></script>
<script>
  startBrowserSdk({
    serviceName: 'my-web-app',
    otlpEndpoint: 'https://telemetry.example.com', // reverse proxy URL; do not include /v1/traces or other signal paths
  });
</script>
```

The bundle works out of the box: you add a script tag and initialize the SDK. The EDOT Browser starts synchronously which ensures the instrumentations are initialized before any activity ocurs. This is likely to impact the load time of your web application.

Loading the script asynchronously ensures the EDOT Browser bundle will not block other resources on the page, however, it will still block browsers onload event.

```html
<script>
  ;(function(d, s, c) {
    var j = d.createElement(s),
      t = d.getElementsByTagName(s)[0]

    j.src = 'https://unpkg.com/@elastic/opentelemetry-browser/build/elastic-otel-browser.min.js'
    j.onload = function() {startBrowserSdk(c)}
    t.parentNode.insertBefore(j, t)
  })(document, 'script', {serviceName: 'my-web-app', otlpEndpoint: 'https://telemetry.example.com'})
</script>
```

Even though this is the recommended pattern, there is a caveat to be aware of. Because the downloading and initializing of the EDOT Browser happens asynchronously, distributed tracing will not work for requests that occur before the agent is initialized.

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
