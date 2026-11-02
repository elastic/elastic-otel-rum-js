# Elastic OpenTelemetry Browser Extension

Chrome extension for developers who want to try [EDOT Browser](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser) (Elastic Distribution of OpenTelemetry Browser) on real sites without changing application code. Configure hosts you care about; when a tab loads a matching URL, the extension injects EDOT and sends traces, metrics, and logs to your Elastic Cloud Hosted (ECH) deployment, serverless observability project, or any OTLP HTTP endpoint you specify.

This is a **development and testing tool**. It is not a replacement for integrating EDOT into your app build or for production RUM rollout.

## What it does

1. **Stores a list of monitored websites** in the browser (Chrome local storage). Each entry defines how EDOT should behave for that host.
2. **Watches open tabs**. When a tab finishes loading an `http:` or `https:` page whose host matches an entry, the extension injects the EDOT bundle.
3. **Exports telemetry** to your OTLP endpoint, including an `Authorization: ApiKey …` header on export requests, using the API key from the entry.

After injection, `window.edotBrowser` is available in the page DevTools console so you can inspect or shut down the SDK (for example `await window.edotBrowser.shutdown()`).

### Fields for each monitored website

| Field | Description |
| --- | --- |
| **Host** | Host part of the URL used for matching (e.g. `localhost`, `staging.example.com`). Subdomains of the configured host also match (e.g. `app.example.com` matches `example.com`). |
| **EDOT version** | npm version of `@elastic/opentelemetry-browser` without the package name (e.g. `0.4.0` or `0.4.0-canary-abcde123`). The bundle is loaded from unpkg. |
| **OTLP endpoint** | Full URL passed to EDOT as `exportConfig.url` (your ECH/serverless OTLP ingest URL or collector). |
| **API key** | Secret sent as `Authorization: ApiKey <value>` on OTLP export requests. |
| **Service name** | `service.name` in Kibana / resource attributes. |
| **Service version** | `service.version` in Kibana / resource attributes. |

## Prerequisites

- [Google Chrome](https://www.google.com/chrome/) (or a Chromium-based browser that supports Manifest V3 extensions)
- An OTLP endpoint that accepts browser traffic (and CORS configured for your origins if needed). See [Proxy and CORS configuration](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser) in the EDOT Browser docs.
- An API key with permission to ingest observability data (for Elastic Cloud / serverless endpoints)

## Installation (Chrome)

### Load the unpacked extension

1. Clone or download this repository and open a terminal in the monorepo root (or copy the `packages/opentelemetry-extension` folder).
2. Install dependencies for typechecking (optional for running the extension, but recommended for development):

   ```bash
   cd packages/opentelemetry-extension
   npm install
   ```

3. In Chrome, open **`chrome://extensions`**.
4. Enable **Developer mode** (toggle in the top-right).
5. Click **Load unpacked**.
6. Select the **`packages/opentelemetry-extension`** directory—the folder that contains `manifest.json`, not a parent or child folder.

The extension **Elastic OpenTelemetry Browser Extension** should appear in the list. Pin it from the puzzle icon in the toolbar if you use it often.

### Updating after code changes

On **`chrome://extensions`**, click the **Reload** icon on this extension’s card. Reload any tabs where you want injection to run again (full page load).

### Removing

On **`chrome://extensions`**, click **Remove** on the extension. Stored website entries are cleared with the extension’s local storage.

## User guide

### 1. Add a monitored website

1. Click the extension icon (**EDOT Browser Monitor**).
2. Fill in the form:
   - **Host** — only the hostname, no scheme or path (e.g. `localhost` for `http://localhost:3000`).
   - **EDOT version** — match a published version on npm for `@elastic/opentelemetry-browser`.
   - **OTLP endpoint** — your ingest URL (must be reachable from the browser; check CORS).
   - **API key** — the key value only; the extension adds the `ApiKey` prefix.
   - **Service name** / **Service version** — labels you will see in Kibana.
3. Click **Save website**.

The entry appears under **Saved entries**. Saving also triggers a refresh: open tabs that already match may get EDOT on the next navigation or after you reload the page.

### 2. Verify injection

1. Open a new tab (or reload) and navigate to a URL whose host matches an entry (e.g. `https://staging.example.com/dashboard`).
2. Open **DevTools → Console**.
3. Confirm `window.edotBrowser` is defined after the page loads.
4. In **Network**, filter for requests to your OTLP host and confirm exports succeed (status 2xx). Failed exports often indicate CORS, wrong endpoint, or invalid API key.

### 3. Edit or delete an entry

- **Edit** — click **Edit** on a saved entry, change the form, then **Save website**.
- **Delete** — click **Delete** on the entry.

Changes apply to new navigations; reload tabs to re-run injection with updated settings.

### 4. Multiple sites

You can save many hosts. Each tab is matched independently: the first entry whose host rules match the tab’s hostname wins (order in the list follows save order). Use distinct **service name** values so services stay separate in Kibana.

### 5. Troubleshooting

| Symptom | Things to check |
| --- | --- |
| No `window.edotBrowser` | Host in the form must match `location.hostname` exactly or as a parent domain; page must be `http`/`https`; reload after saving; check **`chrome://extensions`** for errors on the extension’s service worker. |
| EDOT script fails to load | EDOT version string must exist on unpkg; try a known release from npm. |
| OTLP requests blocked or failing | CORS and endpoint URL; API key and project/ deployment URL; browser DevTools Network tab. |
| Duplicate or stale telemetry | Avoid running this extension together with another in-app RUM/APM agent on the same page. |

## Development

Source is JavaScript with TypeScript checking via JSDoc and `.d.ts` types:

```bash
cd packages/opentelemetry-extension
npm run typecheck
```

Project design notes live in [`PROJECT.md`](./PROJECT.md).

## Security note

API keys are stored in extension local storage and are injected into the page context so EDOT can attach them to export requests. That is convenient for local debugging but **exposes the key to anyone with access to the page origin and DevTools**. For production, Elastic recommends a reverse proxy that adds authentication server-side; see the [EDOT Browser documentation](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser).

## License

Apache-2.0 (see repository `LICENSE` where applicable).
