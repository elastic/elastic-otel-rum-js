/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {trace, context} from '@opentelemetry/api';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
import {
    BatchSpanProcessor,
    TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import {WebTracerProvider} from '@opentelemetry/sdk-trace-web';

import {AsyncApisContextManager} from './context.js';
import {appendPath} from './utils.js';

/**
 * TODO: add processors as config option
 * @param {Object} config
 * @param {string} config.otlpEndpoint
 * @param {import('@opentelemetry/resources').Resource} config.resource
 * @param {Record<string, string>} [config.exportHeaders] // defaults to {}
 * @param {number} [config.sampleRate] // defaults to 1
 * 
 * @returns {{shutdown: () => Promise<void>}}
 */
export function withTraces(config) {
    // TODO: WebTracerProvider comes with
    // - a composite propagator [W3C, Baggage]
    // - a context manager (Stack, which has issues with exporters)
    // Should we allow users to pass their own propagator, contextmanager?
    
    // Set the context manager
    context.setGlobalContextManager(AsyncApisContextManager)

    // traces signal configuration
    const tracesEndpoint = appendPath(config.otlpEndpoint, 'v1/traces').href;
    const spanProcessor = new BatchSpanProcessor(
        new OTLPTraceExporter({
            url: tracesEndpoint,
            headers: config.exportHeaders,
        })
    );
    const tracerProvider = new WebTracerProvider({
        resource: config.resource,
        sampler: new TraceIdRatioBasedSampler(config.sampleRate || 1),
        spanProcessors: [spanProcessor],
    });
    trace.setGlobalTracerProvider(tracerProvider);

    return {
        shutdown: () => tracerProvider.shutdown(),
    };
}
