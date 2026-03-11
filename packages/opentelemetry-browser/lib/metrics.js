/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {metrics} from '@opentelemetry/api';
import {OTLPMetricExporter} from '@opentelemetry/exporter-metrics-otlp-http';
import {
    MeterProvider,
    PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';

import {appendPath} from './utils.js';

/**
 * @typedef {Object} MetricsConfig
 * @property {string} otlpEndpoint
 * @property {Record<string, string>} exportHeaders
 * @property {import('@opentelemetry/resources').Resource} resource
 */

/**
 * @returns {import('./sdk.js').WebSdk<MetricsConfig>}
 */
export function MetricsSdk() {
    /** @type {MeterProvider} */
    let _meterProvider;

    return {
        init(config) {
            const metricsEndpoint = appendPath(
                config.otlpEndpoint,
                'v1/metrics'
            ).href;
            const metricsReader = new PeriodicExportingMetricReader({
                exporter: new OTLPMetricExporter({
                    url: metricsEndpoint,
                    headers: config.exportHeaders,
                }),
            });
            _meterProvider = new MeterProvider({
                resource: config.resource,
                readers: [metricsReader],
            });
            metrics.setGlobalMeterProvider(_meterProvider);
        },
        forceFlush() {
            if (_meterProvider) {
                return _meterProvider.forceFlush();
            }
            return Promise.resolve();
        },
    };
}
