/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Runs in the page MAIN world. Loads EDOT from unpkg and starts the SDK using
 * configuration placed on `window.__EDOT_EXT_CONFIG__` by the extension.
 */
(function injectEdotBrowser() {
    const REPORT_SOURCE = 'edot-browser-extension';

    const config = window.__EDOT_EXT_CONFIG__;
    if (!config) {
        return;
    }

    /**
     * @param {'active' | 'failed'} status
     * @param {string} message
     */
    function reportInjectionStatus(status, message) {
        window.postMessage(
            {
                source: REPORT_SOURCE,
                type: 'injection-status',
                websiteId: config.websiteId,
                host: config.host,
                status,
                message,
            },
            '*'
        );
    }

    const marker = `edot-ext:${config.host}`;
    if (window.__EDOT_EXT_ACTIVE__ === marker) {
        if (window.edotBrowser) {
            reportInjectionStatus('active', 'EDOT SDK is running on this tab.');
        }
        return;
    }
    window.__EDOT_EXT_ACTIVE__ = marker;

    const v = config.version;
    const sn = config.service_name;
    const sv = config.service_version;
    const exportConfig = config.exportConfig;

    if (
        !exportConfig ||
        typeof exportConfig !== 'object' ||
        (!exportConfig.url && !(exportConfig.tracesUrl && exportConfig.logsUrl))
    ) {
        reportInjectionStatus(
            'failed',
            'Export configuration is missing or incomplete.'
        );
        return;
    }

    const sdkConfig = {
        logLevel: 'debug',
        serviceName: sn,
        serviceVersion: sv,
        exportConfig: {
            ...exportConfig,
        },
        resourceAttributes: {
            'service.name': sn,
            'service.version': sv,
        },
    };

    const script = document.createElement('script');
    script.async = false;
    script.src = `https://unpkg.com/@elastic/opentelemetry-browser@${v}/build/elastic-otel-browser.min.js`;
    script.onload = function onEdotBundleLoaded() {
        if (typeof window.startBrowserSdk !== 'function') {
            console.error(
                '[EDOT extension] startBrowserSdk is not available on window'
            );
            reportInjectionStatus(
                'failed',
                'EDOT bundle loaded but startBrowserSdk is missing.'
            );
            return;
        }
        try {
            window.edotBrowser = window.startBrowserSdk(sdkConfig);
            reportInjectionStatus('active', 'EDOT SDK started on this tab.');
        } catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            console.error('[EDOT extension] startBrowserSdk failed', err);
            reportInjectionStatus(
                'failed',
                `EDOT SDK failed to start: ${detail}`
            );
        }
    };
    script.onerror = function onEdotBundleError() {
        console.error('[EDOT extension] Failed to load EDOT bundle from unpkg');
        reportInjectionStatus(
            'failed',
            'Blocked loading EDOT from unpkg (often Content Security Policy).'
        );
    };

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript?.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
    } else {
        (document.head || document.documentElement).appendChild(script);
    }
})();
