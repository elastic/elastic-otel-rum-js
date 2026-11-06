/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @param {unknown} arr
 * @param {(item: unknown) => boolean} isValidItem
 * @returns
 */
export function isValidArray(arr, isValidItem) {
    if (Array.isArray(arr)) {
        return arr.every(isValidItem);
    }
    return false;
}

/**
 * Returns a new URL with the path appended. Avoiding double slash
 * @param {URL} url
 * @param {string} path
 */
export function appendPath(url, path) {
    const result = new URL(url.href);
    result.pathname = (result.pathname + path).replace('//', '/');
    return result;
}

/**
 * @param {unknown} value
 * @param {string} name option name used in the error message
 * @returns {URL}
 */
function parseUrl(value, name) {
    try {
        return new URL(/** @type {string} */ (value) || '');
    } catch (_err) {
        throw new Error(
            `The value "${value}" for "${name}" configuration is not an URL.`
        );
    }
}

/**
 * Resolves the export URL of each signal. A per-signal URL is used as is. Any
 * signal without one gets the signal path appended to the base `url`.
 * @param {{url?: string; tracesUrl?: string; logsUrl?: string; metricsUrl?: string}} [exportConfig]
 * @returns {{tracesUrl: string; logsUrl: string; metricsUrl: string}}
 * @throws {Error} when a value that is going to be used is not a valid URL
 */
export function resolveExportUrls(exportConfig) {
    const {url, tracesUrl, logsUrl, metricsUrl} = exportConfig ?? {};
    /** @type {URL | undefined} */
    let base;

    /**
     * @param {string | undefined} override
     * @param {string} option
     * @param {string} path
     * @returns {string}
     */
    const resolve = (override, option, path) => {
        if (override !== undefined) {
            return parseUrl(override, `exportConfig.${option}`).href;
        }
        base ??= parseUrl(url, 'exportConfig.url');
        return appendPath(base, path).href;
    };

    return {
        tracesUrl: resolve(tracesUrl, 'tracesUrl', 'v1/traces'),
        logsUrl: resolve(logsUrl, 'logsUrl', 'v1/logs'),
        metricsUrl: resolve(metricsUrl, 'metricsUrl', 'v1/metrics'),
    };
}
