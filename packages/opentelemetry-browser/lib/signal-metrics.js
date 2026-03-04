/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { metrics } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import {
    MeterProvider,
    PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';

import { appendPath } from './utils.js';

/**
 * TODO: add readers as config option?
 * @param {Object} config
 * @param {URL} config.endpointUrl
 * @param {import('@opentelemetry/resources').Resource} config.resource
 * @param {Record<string, string>} [config.exportHeaders] // defaults to {}
 * 
 * @returns {{shutdown: () => Promise<void>}}
 */
export function withMetrics(config) {
    // metrics signal configuration
    const metricsEndpoint = appendPath(config.endpointUrl, 'v1/metrics').href;
    const metricsReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: metricsEndpoint,
            headers: config.exportHeaders,
        }),
    });
    const meterProvider = new MeterProvider({
        resource: config.resource,
        readers: [metricsReader],
    });
    metrics.setGlobalMeterProvider(meterProvider);

    return {
        shutdown: () => meterProvider.shutdown(),
    };
}
