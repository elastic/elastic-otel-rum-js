/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {DocumentLoadInstrumentation} from '@opentelemetry/instrumentation-document-load';
import {FetchInstrumentation} from '@opentelemetry/instrumentation-fetch';
import {LongTaskInstrumentation} from '@opentelemetry/instrumentation-long-task';
import {UserInteractionInstrumentation} from '@opentelemetry/instrumentation-user-interaction';
import {XMLHttpRequestInstrumentation} from '@opentelemetry/instrumentation-xml-http-request';
import {ExceptionInstrumentation} from '@opentelemetry/instrumentation-web-exception';

import { buildSdk } from './sdk-builder.js'
import { withTraces } from './signal-traces.js';
import { withLogs } from './signal-logs.js';
import { withMetrics } from './signal-metrics.js';

import { detectResource } from './detector.js';



/**
 * @param {any} cfg 
 */
globalThis['startBrowserSdk'] = function startBrowserSdk(cfg) {
    
    const { serviceName, serviceVersion, resourceAttributes } = cfg;

    // Detect resource
    const resource = detectResource(
        resourceAttributes || {},
        serviceName || 'unknown_service:web',
        serviceVersion
    );
    const sdk = buildSdk(withLogs,withMetrics,withTraces)({
        resource,
        logLevel: cfg.logLevel,
        otlpEndpoint: cfg.otlpEndpoint,
        exportHeaders: cfg.exportHeaders,
        sampleRate: cfg.sampleRate,
        instrumentations: [
            new DocumentLoadInstrumentation(),
            new FetchInstrumentation(),
            new LongTaskInstrumentation(),
            new UserInteractionInstrumentation(),
            new XMLHttpRequestInstrumentation(),
            new ExceptionInstrumentation(),
        ]
    });

    return sdk;
};
