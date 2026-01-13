/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef {{
 *  getSpans: () => Promise<any[]>;
 *  getMetrics: () => Promise<any[]>;
 *  getLogs: () => Promise<any[]>;
 * }} MockServer
 */

/**
 * @param {import('@playwright/test').Page} page
 * @returns {MockServer}
 */
export function mockServerFor(page) {
    const raw = {
        traces: [],
        metrics:[],
        logs: [],
    };
    // intercept EDOT exports
    page.route(/\/v1\/(traces|metrics|logs)$/, async (route, req) => {
        const url = route.request().url();
        const signal = url.split('/').pop();
        const data = JSON.parse(req.postData())
        raw[signal].push(data);
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: '',
        });
    });
    /**
     * 
     * @param {'traces' | 'metrics' | 'logs'} signal 
     * @returns {Promise<any[]>}
     */
    const waitForData = (signal) => new Promise((res) => {
        // We know is enough but we need to configure this to speped up tests
        const timeout = 7_000;
        const start = Date.now();
        // TODO: tell EDOT to flush data
        const intervalId = setInterval(() => {
            const hasSpans = raw[signal].length > 0;
            const timedOut = Date.now() - start > timeout;
            if (hasSpans || timedOut) {
                clearInterval(intervalId);
                res(raw[signal]);
            }
        }, 50);
    })
    return {
        async getSpans() {
            const rawTraces = await waitForData('traces');
            const spans = []
            rawTraces.forEach(trace => {
                trace.resourceSpans.forEach(resourceSpan => {
                    normalizeAttributes(resourceSpan.resource);
                    resourceSpan.scopeSpans.forEach(scopeSpan => {
                        scopeSpan.spans.forEach(span => {
                            normalizeSpan(span);
                            span.resource = resourceSpan.resource;
                            span.scope = scopeSpan.scope;
                            spans.push(span);
                        });
                    });
                });
            });
            // TODO: sort spans?
            return spans;
        },
        async getMetrics() {
            const rawMetrics = await waitForData('metrics');
            // TODO: normalization
            const metrics = [];
            return metrics;
        },
        async getLogs() {
            const rawLogs = await waitForData('logs');
            // TODO: normalize logs
            const logs = [];
            return logs;
        }
    }
}

// -- helper functions
const StatusCodeMap = {
    0: 'STATUS_CODE_UNSET',
    1: 'STATUS_CODE_OK',
    2: 'STATUS_CODE_ERROR',
};
const SpanKindMap = {
    0: 'SPAN_KIND_UNSPECIFIED',
    1: 'SPAN_KIND_INTERNAL',
    2: 'SPAN_KIND_SERVER',
    3: 'SPAN_KIND_CLIENT',
    4: 'SPAN_KIND_PRODUCER',
    5: 'SPAN_KIND_CONSUMER',
}

/**
 * @param {any} span 
 */
function normalizeSpan(span) {
    // Set some properties from enum to a string
    if (typeof span.kind === 'number') {
        span.kind = SpanKindMap[span.kind];
    }
    if (typeof span.status?.code === 'number') {
        span.status = StatusCodeMap[span.status.code];
    }

    // normalize Attributes
    normalizeAttributes(span);
    if (Array.isArray(span.events)) {
        span.events.forEach(normalizeAttributes);
    }
}

/**
 * @param {any} obj 
 */
function normalizeAttributes(obj) {
    const {attributes} = obj;
    if (Array.isArray(attributes)) {
        const attrs = {};
        for (let i = 0; i < attributes.length; i++) {
            const attr = attributes[i];
            attrs[attr.key] = normAttrValue(attr.value);
        }
        obj.attributes = attrs;
    }
}

/**
 * Normalize an 'attributes' value, for example in:
 *      [ { key: 'telemetry.sdk.version', value: { stringValue: '1.19.0' } },
 *        { key: 'process.pid', value: { intValue: '19667' } } ]
 * to a value for converting 'attributes' to a simpler object, e.g.:
 *      { 'telemetry.sdk.version': '1.19.0',
 *        'process.pid': 19667 }
 *
 * NOTE: extracted from https://github.com/elastic/elastic-otel-node/blob/3b35a3eb1a1a1f0459c2a61cc4717f84a9565fb6/packages/mockotlpserver/lib/normalize.js#L50
 * with a couple of changes assuming only JSON payloads are received
 * @param {any} v
 * @returns {any}
 */
function normAttrValue(v) {
    if ('stringValue' in v) {
        return v.stringValue;
    } else if ('boolValue' in v) {
        return v.boolValue;
    } else if ('doubleValue' in v) {
        return v.doubleValue;
    } else if ('arrayValue' in v) {
        return v.arrayValue.values.map(normAttrValue);
    } else if ('intValue' in v) {
        // The OTLP/json serialization uses JS Number for these, so we'll
        // do the same. TODO: Is there not a concern with a 64-bit value?
        if (typeof v.intValue === 'number') {
            return v.intValue;
        } else if (typeof v.intValue === 'string') {
            return Number(v.intValue);
        }
    } else if ('kvlistValue' in v) {
        const obj = {};
        if (v.kvlistValue.values) {
            for (let keyValue of v.kvlistValue.values) {
                obj[keyValue.key] = normAttrValue(keyValue.value);
            }
        }
        return obj;
    } else if (Object.keys(v).length === 0) {
        // Representing an empty value:
        // - proto serialization: KeyValue { key: 'signal', value: AnyValue {} }
        // - json serialization: { key: 'code', value: {} }
        // This normalization will use `null`.
        return null;
    }
    throw new Error(
        `unexpected type of attributes value: ${JSON.stringify(v)}`
    );
}