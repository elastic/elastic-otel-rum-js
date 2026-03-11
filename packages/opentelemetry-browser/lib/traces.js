/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {trace, context, propagation} from '@opentelemetry/api';
import {
    CompositePropagator,
    W3CBaggagePropagator,
    W3CTraceContextPropagator,
} from '@opentelemetry/core';
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

/**
 * @returns {import('./sdk.js').WebSdk<TraceSdkConfig>}
 */
export function TracesSdk() {
    /** @type {WebTracerProvider} */
    let _tracerProvider;

    return {
        init(config) {
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
                sampler: new TraceIdRatioBasedSampler(
                    typeof config.sampleRate === 'number'
                        ? config.sampleRate
                        : 1
                ),
                spanProcessors: [spanProcessor],
            });
            trace.setGlobalTracerProvider(_tracerProvider);

            // NOTE: although `WebTracerProvider#register` does set a context manager
            // an propagators this for us we explicitly set them here so
            // - they can be configured in the future
            // - upstream can deprecate the method without impacting us
            AsyncApisContextManager.enable();
            context.setGlobalContextManager(AsyncApisContextManager);
            propagation.setGlobalPropagator(
                new CompositePropagator({
                    propagators: [
                        new W3CTraceContextPropagator(),
                        new W3CBaggagePropagator(),
                    ],
                })
            );
        },
        forceFlush() {
            if (_tracerProvider) {
                return _tracerProvider.forceFlush();
            }
            return Promise.resolve();
        },
    };
}
