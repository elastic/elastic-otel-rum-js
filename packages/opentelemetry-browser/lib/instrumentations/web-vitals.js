/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// TODO: to be removed when https://github.com/open-telemetry/opentelemetry-browser/pull/145
// is merged and package published

import {SeverityNumber} from '@opentelemetry/api-logs';
import {
    InstrumentationBase,
    safeExecuteInTheMiddle,
} from '@opentelemetry/instrumentation';
import {onCLS, onFCP, onINP, onLCP, onTTFB} from 'web-vitals/attribution';

/**
 * @typedef {import('@opentelemetry/api-logs').LogRecord} LogRecord
 */
/**
 * @typedef {import('@opentelemetry/instrumentation').InstrumentationConfig} InstrumentationConfig
 */
/**
 * WebVitalsInstrumentation Configuration
 * @typedef {Object} WebVitalsInstrumentationConfig
 * @property {boolean} [includeRawAttribution]
 * @property {(record: LogRecord) => void} [applyCustomLogRecordData]
 */

/*
 * This file contains a copy of unstable semantic convention definitions.
 * @see https://github.com/open-telemetry/opentelemetry-js/tree/main/semantic-conventions#unstable-semconv
 */
const WEB_VITAL_EVENT_NAME = 'browser.web_vital';

// Core metric attributes
/**
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
const ATTR_WEB_VITAL_NAME = 'browser.web_vital.name';

/**
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
const ATTR_WEB_VITAL_VALUE = 'browser.web_vital.value';

/**
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
const ATTR_WEB_VITAL_RATING = 'browser.web_vital.rating';

/**
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
const ATTR_WEB_VITAL_DELTA = 'browser.web_vital.delta';

/**
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
const ATTR_WEB_VITAL_ID = 'browser.web_vital.id';

/**
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
const ATTR_WEB_VITAL_NAVIGATION_TYPE = 'browser.web_vital.navigation_type';

export class WebVitalsInstrumentation extends InstrumentationBase {
    // _isEnabled;
    // _listenersRegistered;
    // _applyCustomLogRecordData;

    /**
     * @param {InstrumentationConfig & WebVitalsInstrumentationConfig} config
     */
    constructor(config = {}) {
        super('@opentelemetry/instrumentation-web-vitals', '0.1.0', config);
        this._applyCustomLogRecordData = config.applyCustomLogRecordData;
        this._includeRawAttribution = config.includeRawAttribution ?? false;
    }

    init() {
        return [];
    }

    /**
     * Enables the instrumentation and registers web-vitals listeners.
     * Listeners are registered only once. If disabled, subsequent calls resume emission.
     */
    enable() {
        if (typeof PerformanceObserver === 'undefined') {
            this._diag.debug(
                'PerformanceObserver not supported, web vitals will not be collected'
            );
            return;
        }

        this._isEnabled = true;

        if (this._listenersRegistered) {
            this._diag.debug('Listeners already registered, resuming emission');
            return;
        }

        this._listenersRegistered = true;
        this._diag.debug(`Registering listeners`);
        // CLS is only supported in Chromium. See:
        // https://github.com/GoogleChrome/web-vitals?tab=readme-ov-file#browser-support
        onCLS((metric) => this._emitWebVital(metric));
        onINP((metric) => this._emitWebVital(metric));
        onLCP((metric) => this._emitWebVital(metric));
        onFCP((metric) => this._emitWebVital(metric));
        onTTFB((metric) => this._emitWebVital(metric));
    }

    /**
     * Disables the instrumentation, pausing log emission.
     * Listeners remain active due to web-vitals library limitations.
     */
    disable() {
        this._isEnabled = false;
        this._diag.debug('Instrumentation disabled, pausing emission');
    }

    /**
     * Gets the timestamp for a metric based on attribution timing.
     * Returns undefined to let OTel use the current time for metrics without
     * specific timing information.
     */
    _getTimestampForMetric(metric) {
        if (metric.name === 'CLS') {
            const {attribution} = metric;
            if (attribution.largestShiftTime !== undefined) {
                return attribution.largestShiftTime;
            }
            return undefined;
        }
        if (metric.name === 'INP') {
            const {attribution} = metric;
            return attribution.interactionTime;
        }
        // FCP, LCP, TTFB: metric.value is already DOMHighResTimeStamp of the event
        return metric.value;
    }

    _emitWebVital(metric) {
        if (!this._isEnabled) {
            return;
        }
        const attributes = {
            [ATTR_WEB_VITAL_NAME]: metric.name.toLowerCase(),
            [ATTR_WEB_VITAL_VALUE]: metric.value,
            // `delta` equals `value` on the first emission; subsequent emissions report only the change
            [ATTR_WEB_VITAL_DELTA]: metric.delta,
            [ATTR_WEB_VITAL_RATING]: metric.rating,
            [ATTR_WEB_VITAL_ID]: metric.id,
            [ATTR_WEB_VITAL_NAVIGATION_TYPE]: metric.navigationType,
        };

        const timestamp = this._getTimestampForMetric(metric);

        const logRecord = {
            eventName: WEB_VITAL_EVENT_NAME,
            severityNumber: SeverityNumber.INFO,
            attributes,
            ...(this._includeRawAttribution
                ? {body: JSON.stringify(metric.attribution)}
                : {}),
            ...(timestamp !== undefined ? {timestamp} : {}),
        };

        if (this._applyCustomLogRecordData) {
            safeExecuteInTheMiddle(
                () => this._applyCustomLogRecordData?.(logRecord),
                (error) => {
                    if (error) {
                        this._diag.error(
                            'applyCustomLogRecordData hook failed',
                            error
                        );
                    }
                },
                true
            );
        }

        this.logger.emit(logRecord);
    }
}
