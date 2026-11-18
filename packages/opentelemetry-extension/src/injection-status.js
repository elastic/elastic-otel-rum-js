/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/** Message `source` used between MAIN-world injection and the isolated bridge. */
export const INJECTION_REPORT_SOURCE = 'edot-browser-extension';

/** @typedef {import('./types/websites.js').InjectionStatus} InjectionStatus */

/**
 * @param {unknown} err
 * @returns {string}
 */
export function describeInjectionError(err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
        /cannot access|Cannot inject|extensions gallery|chrome:\/\//i.test(
            message
        )
    ) {
        return 'Extension cannot inject scripts on this page.';
    }
    if (/CSP|content security policy/i.test(message)) {
        return 'Injection blocked by the page Content Security Policy.';
    }
    return message || 'Injection failed.';
}
