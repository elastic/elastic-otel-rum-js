---
navigation_title: Set up
description: Set up the Elastic Distribution of OpenTelemetry Browser (EDOT Browser).
applies_to:
  stack: ga
  serverless:
    observability: ga
products:
  - id: cloud-serverless
  - id: observability
  - id: edot-sdk
---

# Set up EDOT Browser

To monitor your service with the {{edot}} (EDOT) Browser you need to install it, configure it, and properly start it with your application.

There are multiple ways to install EDOT Browser in your web application:

- Using Script Tags: Add a <script> tag to the HTML page.
- Using Bundlers: Bundling the EDOT during the application’s build process


## Using script tags [using_script_tags]

EDOT browser provides a single script file that configures traces metrics and logs and includes
a preset of instrumentations. This script can be added in two different ways

### Synchronous / Blocking Pattern

With the sync pattern the browser blocks the rendering process untill the script is loaded an
evaluated. Add a <script> tag to load the bundle and use the `startBrowserSdk` global function
to start instrumenting:

```html
<script src="https://xxxx.com/elastic-otel-rum.min.js" crossorigin></script>
<script>
  startBrowserSdk({
    // TODO: add config example
  })
</script>
```

### Asynchronous / Non-Blocking Pattern

Loading the script asynchronously ensures the agent script will not block other resources on the page, however, it will still block browsers `onload` event.

```html
<script>
  ;(function(d, s, c) {
    var j = d.createElement(s),
      t = d.getElementsByTagName(s)[0]

    j.src = 'https://xxxx.com/elastic-otel-rum.min.js'
    j.onload = function() {startBrowserSdk(c)}
    t.parentNode.insertBefore(j, t)
  })(
    document,
    'script',
    {
      // TODO: add config example
    }
  )
</script>
```

Even though this is the recommended pattern, there is a caveat to be aware of. Because the downloading and starting the SDK happens asynchronously, distributed tracing will not work for requests that occur before the sdk is started.

:::{note}
Please download the latest version of RUM agent from [GitHub](https://github.com/elastic/elastic-otel-rum-js/releases/latest) or [UNPKG](xxxx) and host the file in your Server/CDN before deploying to production. Remember to use a proper versioning scheme and set a far future `max-age` and `immutable` in the [cache-control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) header, as the file never changes.
:::

<!-- TODO: add here about user interactions if finally included in intrumentations -->

## Using Bundlers [using_bundlers]

Install the EDOT Browser as a dependency to your application:

```bash
npm install @elastic/opentelemetry-browser --save
```

Configure the EDOT within your application code:

```js
import { startBrowserSdk } from '@elastic/opentelemetry-browser'

const sdk = startBrowserSdk({
  // TODO: add config example
})
```

Make sure you start the EDOT before application so any task performed by it, like HTTP request,
are properly tracked.
