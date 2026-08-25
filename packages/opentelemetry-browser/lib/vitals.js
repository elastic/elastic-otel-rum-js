/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Flatten web-vitals attribution onto `browser.web_vital.*` attributes so
 * Kibana can aggregate without parsing the JSON body.
 *
 * @param {import('@opentelemetry/api-logs').LogRecord} logRecord
 */
export function applyWebVitalAttribution(logRecord) {
    const attributes = logRecord.attributes;
    if (!attributes) {
        return;
    }
    /** @type {Record<string, unknown> | undefined} */
    let attribution;
    if (typeof logRecord.body === 'string' && logRecord.body.startsWith('{')) {
        try {
            attribution = JSON.parse(logRecord.body);
        } catch {
            attribution = undefined;
        }
    }
    if (!attribution || typeof attribution !== 'object') {
        return;
    }

    const name = String(attributes['browser.web_vital.name'] ?? '').toLowerCase();
    /**
     * @param {string} key
     * @param {unknown} value
     */
    const set = (key, value) => {
        if (value == null || value === '') {
            return;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            attributes[key] = value;
            return;
        }
        attributes[key] = String(value);
    };

    if (name === 'lcp') {
        set('browser.web_vital.lcp.element', attribution.element);
        set('browser.web_vital.lcp.url', attribution.url);
        set('browser.web_vital.lcp.ttfb', attribution.timeToFirstByte);
        set(
            'browser.web_vital.lcp.resource_load_delay',
            attribution.resourceLoadDelay
        );
        set(
            'browser.web_vital.lcp.resource_load_duration',
            attribution.resourceLoadDuration
        );
        set(
            'browser.web_vital.lcp.element_render_delay',
            attribution.elementRenderDelay
        );
        return;
    }
    if (name === 'inp') {
        set('browser.web_vital.inp.target', attribution.interactionTarget);
        set('browser.web_vital.inp.type', attribution.interactionType);
        set('browser.web_vital.inp.input_delay', attribution.inputDelay);
        set(
            'browser.web_vital.inp.processing_duration',
            attribution.processingDuration
        );
        set(
            'browser.web_vital.inp.presentation_delay',
            attribution.presentationDelay
        );
        return;
    }
    if (name === 'cls') {
        set('browser.web_vital.cls.source', attribution.largestShiftTarget);
        set('browser.web_vital.cls.value', attribution.largestShiftValue);
    }
}
