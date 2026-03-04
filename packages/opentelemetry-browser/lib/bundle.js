/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { diag, DiagLogLevel } from '@opentelemetry/api';

import {registerInstrumentations} from '@opentelemetry/instrumentation';
import {DocumentLoadInstrumentation} from '@opentelemetry/instrumentation-document-load';
import {FetchInstrumentation} from '@opentelemetry/instrumentation-fetch';
import {LongTaskInstrumentation} from '@opentelemetry/instrumentation-long-task';
import {UserInteractionInstrumentation} from '@opentelemetry/instrumentation-user-interaction';
import {XMLHttpRequestInstrumentation} from '@opentelemetry/instrumentation-xml-http-request';
import {ExceptionInstrumentation} from '@opentelemetry/instrumentation-web-exception';

import { setupSdk } from './sdk-builder.js'
import { withTraces } from './signal-traces.js';
import { withLogs } from './signal-logs.js';
import { withMetrics } from './signal-metrics.js';

import { createLogger } from './logging.js';
import { detectResource } from './detector.js';


/**
 * @typedef {Object} BrowserSdkConfiguration
 * @property {boolean} [disabled]
 * @property {string} [serviceName]
 * @property {string} [serviceVersion]
 * @property {string} [logLevel] // defaults to 'info'
 * @property {number} [sampleRate] // defaults to 1
 * @property {Record<string, import('./detector.js').AttributeValue>} [resourceAttributes]
 * @property {string} [otlpEndpoint] // defaults to 'http://localhost:4318'
 * @property {Record<string, string>} [exportHeaders] // defaults to {}
 */


// To control multiple calls to `startBrowserSdk`
let sdkStarted = false;
/** @type {BrowserSdkConfiguration} */
const defaultConfig = {
    logLevel: 'info',
    sampleRate: 1,
    serviceName: 'unknown_service:web',
    resourceAttributes: {},
    otlpEndpoint: 'http://localhost:4318',
    exportHeaders: {},
};

/**
 * @param {BrowserSdkConfiguration} cfg 
 */
globalThis['startBrowserSdk'] = function startBrowserSdk(cfg) {
    if (sdkStarted || cfg.disabled) {
        return;
    }

    const logLevel = cfg.logLevel ?? defaultConfig.logLevel;
    diag.setLogger(createLogger({ logLevel }), { logLevel: DiagLogLevel.ALL });
    diag.debug(`Browser SDK intialization`, cfg);

    const { serviceName, serviceVersion } = cfg;
    const config = { ...defaultConfig, ...cfg };

    // Input validation
    /** @type {URL} */
    let endpointUrl;
    try {
        endpointUrl = new URL(config.otlpEndpoint);
    } catch (urlErr) {
        diag.error(
            `The value "${config.otlpEndpoint}" for "otlpEndpoint" configuration is not an URL. SDK won't start.`
        );
        return;
    }

    // Detect resource
    const resource = detectResource(
        config.resourceAttributes,
        serviceName,
        serviceVersion
    );
    const sdk = setupSdk(
        withLogs,
        withTraces,
        withMetrics,
        {
            endpointUrl,
            resource,
            exportHeaders: config.exportHeaders,
            sampleRate: 1
        }
    );

    // TODO: set configs here
    const instrumentations = [
        new DocumentLoadInstrumentation(),
        new FetchInstrumentation(),
        new LongTaskInstrumentation(),
        new UserInteractionInstrumentation(),
        new XMLHttpRequestInstrumentation(),
        new ExceptionInstrumentation(),
    ];
    registerInstrumentations({instrumentations});

    return sdk;
};
