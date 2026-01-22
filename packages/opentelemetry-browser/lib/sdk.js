/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag, DiagLogLevel, metrics} from '@opentelemetry/api';
import {logs} from '@opentelemetry/api-logs';
import {OTLPLogExporter} from '@opentelemetry/exporter-logs-otlp-http';
import {OTLPMetricExporter} from '@opentelemetry/exporter-metrics-otlp-http';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
import {BatchLogRecordProcessor, LoggerProvider} from '@opentelemetry/sdk-logs';
import {
    MeterProvider,
    PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import {
    BatchSpanProcessor,
    TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import {WebTracerProvider} from '@opentelemetry/sdk-trace-web';

import {registerInstrumentations} from '@opentelemetry/instrumentation';
import {DocumentLoadInstrumentation} from '@opentelemetry/instrumentation-document-load';
import {FetchInstrumentation} from '@opentelemetry/instrumentation-fetch';
import {LongTaskInstrumentation} from '@opentelemetry/instrumentation-long-task';
import {UserInteractionInstrumentation} from '@opentelemetry/instrumentation-user-interaction';
import {XMLHttpRequestInstrumentation} from '@opentelemetry/instrumentation-xml-http-request';
import {ExceptionInstrumentation} from '@opentelemetry/instrumentation-web-exception';

import {createLogger} from './logging.js';
import {detectResource} from './detector.js';

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
 *
 * // other options
 * @property {number} [samplingRate]
 */

// To control multipla calls to `startBrowserSdk`
let sdkStarted = false;

/** @type {BrowserSdkConfiguration} */
const defaultConfig = {
    logLevel: 'info',
    sampleRate: 1,
    serviceName: 'unknown_service:web',
    resourceAttributes: {},
    otlpEndpoint: 'http://localhost:4318',
    exportHeaders: {},
    //TODO: instrumentation configurations
};

/**
 * Returns a new URL with the path appended. Avoiding double slash
 * @param {URL} url 
 * @param {string} path 
 */
function appendPath(url, path) {
    const result = new URL(url.href);
    result.pathname = (result.pathname + path).replace('//', '/');
    return result;
}

/**
 * @param {BrowserSdkConfiguration} cfg
 */
export function startBrowserSdk(cfg = {}) {
    if (sdkStarted || cfg.disabled) {
        return;
    }

    const logLevel = cfg.logLevel ?? defaultConfig.logLevel;
    diag.setLogger(createLogger({logLevel}), {logLevel: DiagLogLevel.ALL});
    diag.debug(`Browser SDK intialization`, cfg);

    const {serviceName, serviceVersion} = cfg;
    const config = {...defaultConfig, ...cfg};

    // Input validation
    /** @type {URL} */
    let endpointUrl;
    try {
        endpointUrl = new URL(config.otlpEndpoint);
        console.log(endpointUrl.pathname)
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

    // NOTE: export payloads can be seen in DevTools network tab in JSON format
    // so IMHO it would be redundant to use console exporters

    // traces signal configuration
    // const tracesEndpoint = `${endpointUrl.href}v1/traces`;
    const tracesEndpoint = appendPath(endpointUrl, 'v1/traces').href;
    const tracerProvider = new WebTracerProvider({
        resource,
        sampler: new TraceIdRatioBasedSampler(config.sampleRate),
        spanProcessors: [
            new BatchSpanProcessor(
                new OTLPTraceExporter({
                    url: tracesEndpoint,
                    headers: config.exportHeaders,
                })
            ),
        ],
    });
    // TODO: WebTracerProvider comes with
    // - a composite propagator [W3C, Baggage]
    // - a context manager (no-op)
    // Should we allow users to pass their own propagator, contextmanager?
    tracerProvider.register();
    // ideally it shoud be
    // trace.setGlobalTracerProvider(tracerProvider);
    // but there is no way to set propagators and context manager

    // metrics signal configuration
    // const metricsEndpoint = `${endpointUrl.href}v1/metrics`;
    const metricsEndpoint = appendPath(endpointUrl, 'v1/metrics').href;
    const meterProvider = new MeterProvider({
        resource,
        readers: [
            new PeriodicExportingMetricReader({
                exporter: new OTLPMetricExporter({
                    url: metricsEndpoint,
                    headers: config.exportHeaders,
                }),
            }),
        ],
    });
    metrics.setGlobalMeterProvider(meterProvider);

    // logs signal configuration
    // const logsEndpoint = `${endpointUrl.href}v1/logs`;
    const logsEndpoint = appendPath(endpointUrl, 'v1/logs').href;
    const loggerProvider = new LoggerProvider({
        resource,
        processors: [
            new BatchLogRecordProcessor(
                new OTLPLogExporter({
                    url: logsEndpoint,
                    headers: config.exportHeaders,
                })
            ),
        ],
    });
    logs.setGlobalLoggerProvider(loggerProvider);

    // Resgister instrumentations
    // TODO: decide on how to let the user config this
    registerInstrumentations({
        instrumentations: [
            new DocumentLoadInstrumentation(),
            new FetchInstrumentation(),
            new LongTaskInstrumentation(),
            new UserInteractionInstrumentation(),
            new XMLHttpRequestInstrumentation(),
            new ExceptionInstrumentation(),
        ],
    });

    // Flag as started
    sdkStarted = true;

    // TODO: return API??? flush???
}
