/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @param {number} start
 * @param {number} end
 * @returns {number | undefined}
 */
const phase = (start, end) => {
    if (
        typeof start !== 'number' ||
        typeof end !== 'number' ||
        start < 0 ||
        end < 0 ||
        end < start
    ) {
        return undefined;
    }
    return Math.round(end - start);
};

/**
 * Per-phase Resource Timing attributes (ms).
 *
 * @param {PerformanceResourceTiming | PerformanceNavigationTiming} entry
 * @returns {Record<string, string | number>}
 */
export function resourceTimingAttributes(entry) {
    /** @type {Record<string, string | number>} */
    const attrs = {};
    const dns = phase(entry.domainLookupStart, entry.domainLookupEnd);
    const tcp = phase(entry.connectStart, entry.connectEnd);
    const tls =
        entry.secureConnectionStart > 0
            ? phase(entry.secureConnectionStart, entry.connectEnd)
            : undefined;
    const request = phase(entry.requestStart, entry.responseStart);
    const response = phase(entry.responseStart, entry.responseEnd);
    const queue = phase(entry.startTime, entry.fetchStart);

    if (dns != null) {
        attrs['http.dns.duration'] = dns;
    }
    if (tcp != null) {
        attrs['http.tcp.duration'] = tcp;
    }
    if (tls != null) {
        attrs['http.tls.duration'] = tls;
    }
    if (request != null) {
        attrs['http.request.duration'] = request;
    }
    if (response != null) {
        attrs['http.response.duration'] = response;
    }
    if (queue != null) {
        attrs['http.queue.duration'] = queue;
    }

    const encoded = /** @type {PerformanceResourceTiming} */ (entry)
        .encodedBodySize;
    if (typeof encoded === 'number' && encoded >= 0) {
        attrs['http.response.size.encoded'] = encoded;
    }

    const status = /** @type {{responseStatus?: number}} */ (entry)
        .responseStatus;
    if (typeof status === 'number' && status > 0) {
        attrs['http.response.status_code'] = status;
    }

    const blocking = /** @type {{renderBlockingStatus?: string}} */ (entry)
        .renderBlockingStatus;
    if (typeof blocking === 'string' && blocking) {
        attrs['http.render_blocking_status'] = blocking;
    }

    return attrs;
}

/**
 * Latest resource/navigation timing entry for a URL.
 *
 * @param {string} [url]
 * @returns {PerformanceResourceTiming | PerformanceNavigationTiming | undefined}
 */
export function lookupResourceTiming(url) {
    if (typeof performance === 'undefined' || !url) {
        return undefined;
    }
    const entries = performance.getEntriesByName(url);
    for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.entryType === 'resource' || entry.entryType === 'navigation') {
            return /** @type {PerformanceResourceTiming} */ (entry);
        }
    }
    return undefined;
}

/**
 * Stamp resource-timing phases onto an OTel span.
 *
 * @param {import('@opentelemetry/api').Span} span
 * @param {PerformanceResourceTiming | PerformanceNavigationTiming | undefined} [entry]
 * @param {string} [url]
 */
export function stampResourceTiming(span, entry, url) {
    const resolved = entry ?? lookupResourceTiming(url);
    if (!resolved) {
        return;
    }
    span.setAttributes(resourceTimingAttributes(resolved));
}

/**
 * @param {Record<string, unknown>} attributes
 * @returns {string | undefined}
 */
export function urlFromAttributes(attributes) {
    const keys = ['url.full', 'http.url', 'page.url', 'http.request.url'];
    for (const key of keys) {
        const value = attributes[key];
        if (typeof value === 'string' && value) {
            return value;
        }
    }
    return undefined;
}
