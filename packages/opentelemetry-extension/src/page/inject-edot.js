/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Runs in the page MAIN world. Loads EDOT from unpkg and starts the SDK using
 * configuration placed on `window.__EDOT_EXT_CONFIG__` by the extension.
 */
(function injectEdotBrowser() {
    const config = window.__EDOT_EXT_CONFIG__;
    if (!config) {
        return;
    }

    const marker = `edot-ext:${config.host}`;
    if (window.__EDOT_EXT_ACTIVE__ === marker) {
        return;
    }
    window.__EDOT_EXT_ACTIVE__ = marker;

    const v = config.version;
    const u = config.endpoint;
    const sn = config.service_name;
    const sv = config.service_version;
    const apiKey = config.api_key;

    const sdkConfig = {
        logLevel: 'debug',
        serviceName: sn,
        serviceVersion: sv,
        exportConfig: {
            url: u,
            headers: {
                Authorization: `ApiKey ${apiKey}`,
            },
        },
        resourceAttributes: {
            'service.name': sn,
            'service.version': sv,
        },
    };

    const script = document.createElement('script');
    script.src = `https://unpkg.com/@elastic/opentelemetry-browser@${v}/build/elastic-otel-browser.min.js`;
    script.onload = function onEdotBundleLoaded() {
        if (typeof window.startBrowserSdk !== 'function') {
            console.error(
                '[EDOT extension] startBrowserSdk is not available on window'
            );
            return;
        }
        window.edotBrowser = window.startBrowserSdk(sdkConfig);
    };
    script.onerror = function onEdotBundleError() {
        console.error('[EDOT extension] Failed to load EDOT bundle from unpkg');
    };

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript?.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
    } else {
        (document.head || document.documentElement).appendChild(script);
    }
})();
