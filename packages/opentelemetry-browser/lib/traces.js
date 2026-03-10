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
 * @typedef {Object} TraceSdkConfig
 * @property {string} otlpEndpoint
 * @property {number} sampleRate
 * @property {Record<string, string>} exportHeaders
 * @property {import('@opentelemetry/resources').Resource} resource
 */

/** @type {WebTracerProvider} */
let _tracerProvider;

/** @type {import('./sdk-builder.js').WebSdk<TraceSdkConfig>} */
export const TracesSdk = {
    init(config) {
        // TODO: WebTracerProvider comes with
        // - a composite propagator [W3C, Baggage]
        // - a context manager (Stack, which has issues with exporters)
        // Should we allow users to pass their own propagator, contextmanager?

        // Set the context manager
        context.setGlobalContextManager(AsyncApisContextManager);

        // traces signal configuration
        const tracesEndpoint = appendPath(
            config.otlpEndpoint,
            'v1/traces'
        ).href;
        const spanProcessor = new BatchSpanProcessor(
            new OTLPTraceExporter({
                url: tracesEndpoint,
                headers: config.exportHeaders,
            })
        );
        _tracerProvider = new WebTracerProvider({
            resource: config.resource,
            sampler: new TraceIdRatioBasedSampler(config.sampleRate || 1),
            spanProcessors: [spanProcessor],
        });
        trace.setGlobalTracerProvider(_tracerProvider);
    },
    forceFlush() {
        return _tracerProvider?.forceFlush();
    },
};
