# otel-edot-rum-js basic example

## Setup

```sh
npm run setup
```

This installs dependencies for the example and for `packages/opentelemetry-browser`.

## Run

```sh
npm start
```

This builds the browser agent, copies it to `public/assets`, and serves the example at http://localhost:3000.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Port the example server listens on. |
| `BROWSER_OTLP_ENDPOINT` | _(unset)_ | OTLP/HTTP endpoint the browser exports to. When unset, the browser exports to the example server, which logs the data to the console. |
| `BROWSER_OTLP_HEADERS` | _(unset)_ | Comma-separated `key=value` browser export headers. These are embedded in the page, so don't put secrets here. |

The server itself is instrumented with [EDOT Node.js](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/nodejs), configured with the standard `OTEL_*` env vars (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`, `OTEL_EXPORTER_OTLP_HEADERS`, ...). `OTEL_SERVICE_NAME` defaults to `otel-browser-example-server`.

Example using an otel collector setup, with the server exporting gRPC to the collector and the browser exporting through an nginx proxy:

```sh
env OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 \
OTEL_EXPORTER_OTLP_PROTOCOL=grpc \
BROWSER_OTLP_ENDPOINT=http://localhost:14318 \
PORT=3200 \
npm start
```
