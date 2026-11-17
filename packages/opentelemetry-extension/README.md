# Elastic OpenTelemetry Browser Extension

Chrome extension for developers who want to try [EDOT Browser](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser) (Elastic Distribution of OpenTelemetry Browser) on real sites without changing application code. Configure OTLP collectors and the hosts you care about; when a tab loads a matching URL, the extension injects EDOT and sends traces, metrics, and logs through the website’s linked collector to your Elastic Cloud Hosted (ECH) deployment, serverless observability project, or any OTLP HTTP endpoint you specify in that collector.

This is a **development and testing tool**. It is not a replacement for integrating EDOT into your app build or for production RUM rollout.

## What it does

1. **Stores OTLP collectors** in the browser (Chrome local storage). Each collector holds your export URL(s), API key, and a display name. Multiple websites can share one collector.
2. **Stores monitored websites** linked to a collector. Each website defines the host to match, EDOT version, and Kibana service labels.
3. **Watches open tabs**. When a tab finishes loading an `http:` or `https:` page whose host matches a website entry, the extension injects the EDOT bundle and sends traces, metrics, and logs using that website’s linked collector.

After injection, `window.edotBrowser` is available in the page DevTools console so you can inspect or shut down the SDK (for example `await window.edotBrowser.shutdown()`).

### Fields for each collector

| Field | Description |
| --- | --- |
| **Name** | Label shown in the UI and in the website’s collector picker. |
| **Base OTLP URL** | Full URL passed to EDOT as `exportConfig.url` when you use a single ingest endpoint. Optional if you set both **Logs URL** and **Traces URL** instead. |
| **Logs URL** | Full logs export URL (`exportConfig.logsUrl`). Use with **Traces URL** when signals use different endpoints. |
| **Traces URL** | Full traces export URL (`exportConfig.tracesUrl`). Use with **Logs URL** when signals use different endpoints. |
| **API key** | Secret sent as `Authorization: ApiKey <value>` on OTLP export requests. |

You must provide either a **Base OTLP URL** or **both** Logs and Traces URLs.

### Fields for each monitored website

| Field | Description |
| --- | --- |
| **Collector** | Which saved collector supplies export URLs and API key for this site. |
| **Host** | Host part of the URL used for matching (e.g. `localhost`, `staging.example.com`). Subdomains of the configured host also match (e.g. `app.example.com` matches `example.com`). |
| **EDOT version** | npm version of `@elastic/opentelemetry-browser` without the package name (e.g. `0.4.0` or `0.4.0-canary-abcde123`). The bundle is loaded from unpkg. |
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

On **`chrome://extensions`**, click **Remove** on the extension. Stored collectors and website entries are cleared with the extension’s local storage.

## User guide

The popup has two tabs: **Collectors** and **Websites**. Configure at least one collector before you can save a website.

### 1. Add a collector

1. Click the extension icon (**EDOT Browser Monitor**).
2. Open the **Collectors** tab.
3. Fill in the form:
   - **Name** — a short label (e.g. `ECH production`, `Local collector`).
   - **Base OTLP URL** — your ingest URL if one endpoint handles all signals (must be reachable from the browser; check CORS). Leave empty only when you set both signal URLs below.
   - **Logs URL** / **Traces URL** — optional per-signal URLs when you are not using a single base URL.
   - **API key** — the key value only; the extension adds the `ApiKey` prefix.
4. Click **Save collector**.

The entry appears under **Saved collectors**. You can edit it anytime; websites linked to that collector use the updated export settings on the next injection.

### 2. Add a monitored website

1. Open the **Websites** tab (or use **Go to Collectors** if the form says you need a collector first).
2. Fill in the form:
   - **Collector** — choose a saved collector.
   - **Host** — only the hostname, no scheme or path (e.g. `localhost` for `http://localhost:3000`).
   - **EDOT version** — match a published version on npm for `@elastic/opentelemetry-browser`.
   - **Service name** / **Service version** — labels you will see in Kibana.
3. Click **Save website**.

The entry appears under **Saved websites**. Saving also triggers a refresh: open tabs that already match may get EDOT on the next navigation or after you reload the page.

### 3. Verify injection

1. Open a new tab (or reload) and navigate to a URL whose host matches a website entry (e.g. `https://staging.example.com/dashboard`).
2. Open **DevTools → Console**.
3. Confirm `window.edotBrowser` is defined after the page loads.
4. In **Network**, filter for requests to your OTLP host and confirm exports succeed (status 2xx). Failed exports often indicate CORS, wrong endpoint on the linked collector, or an invalid API key.

### 4. Edit or delete

**Collectors**

- **Edit** — on the **Collectors** tab, click **Edit** on a saved collector, change the form, then **Save collector**.
- **Delete** — removes the collector and **all websites** linked to it. Confirm the prompt if sites are attached.

**Websites**

- **Edit** — on the **Websites** tab, click **Edit**, change the form (including switching collector), then **Save website**.
- **Delete** — removes only that website.

Changes apply to new navigations; reload tabs to re-run injection with updated settings.

### 5. Multiple sites

Several websites can use the same collector (for example the same ECH deployment). Each tab is matched independently: the first website entry whose host rules match the tab’s hostname wins (order in the list follows save order). Use distinct **service name** values so services stay separate in Kibana.

### 6. Troubleshooting

| Symptom | Things to check |
| --- | --- |
| No `window.edotBrowser` | Host in the form must match `location.hostname` exactly or as a parent domain; page must be `http`/`https`; reload after saving; check **`chrome://extensions`** for errors on the extension’s service worker. |
| EDOT script fails to load | EDOT version string must exist on unpkg; try a known release from npm. |
| OTLP requests blocked or failing | CORS and export URLs on the website’s linked collector; API key and project/deployment URL; browser DevTools Network tab. |
| Duplicate or stale telemetry | Avoid running this extension together with another in-app RUM/APM agent on the same page. |

## Development

Source is JavaScript with TypeScript checking via JSDoc and `.d.ts` types:

```bash
cd packages/opentelemetry-extension
npm run typecheck
```

## Security note

API keys are stored with collector entries in extension local storage and are injected into the page context so EDOT can attach them to export requests. That is convenient for local debugging but **exposes the key to anyone with access to the page origin and DevTools**. For production, Elastic recommends a reverse proxy that adds authentication server-side; see the [EDOT Browser documentation](https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/browser).

## License

Apache-2.0 (see repository `LICENSE` where applicable).