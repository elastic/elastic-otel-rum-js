/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {import('./types/collectors.js').Collector} Collector */
/** @typedef {import('./types/websites.js').EdotInjectExportConfig} EdotInjectExportConfig */

const COLLECTOR_EXPORT_URLS_INVALID =
    'Set a base OTLP URL, or both Logs URL and Traces URL.';

/**
 * @param {string} value
 * @returns {boolean}
 */
function isNonEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {Pick<Collector, 'url' | 'logs_url' | 'traces_url'>} collector
 * @returns {void}
 */
export function validateCollectorExportUrls(collector) {
    const url = collector.url.trim();
    const logsUrl = collector.logs_url.trim();
    const tracesUrl = collector.traces_url.trim();

    const hasBase = isNonEmpty(url);
    const hasBothSignals = isNonEmpty(logsUrl) && isNonEmpty(tracesUrl);

    if (hasBase || hasBothSignals) {
        return;
    }

    throw new Error(COLLECTOR_EXPORT_URLS_INVALID);
}

/**
 * @param {Collector} collector
 * @returns {EdotInjectExportConfig}
 */
export function exportConfigFromCollector(collector) {
    validateCollectorExportUrls(collector);

    /** @type {EdotInjectExportConfig} */
    const exportConfig = {
        headers: {
            Authorization: `ApiKey ${collector.api_key.trim()}`,
        },
    };

    const url = collector.url.trim();
    const logsUrl = collector.logs_url.trim();
    const tracesUrl = collector.traces_url.trim();

    if (isNonEmpty(url)) {
        exportConfig.url = url;
    }
    if (isNonEmpty(tracesUrl)) {
        exportConfig.tracesUrl = tracesUrl;
    }
    if (isNonEmpty(logsUrl)) {
        exportConfig.logsUrl = logsUrl;
    }

    return exportConfig;
}
