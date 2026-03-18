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
import {WebVitalsInstrumentation} from './instrumentations/web-vitals.js';

import {AsyncApisContextManager} from './context.js';
import {createLogger} from './logging.js';
import {detectResource} from './detector.js';

/**
 * @typedef {{
 *  "@opentelemetry/instrumentation-document-load": import('@opentelemetry/instrumentation-document-load').DocumentLoadInstrumentationConfig;
 *  "@opentelemetry/instrumentation-fetch": import('@opentelemetry/instrumentation-fetch').FetchInstrumentationConfig;
 *  "@opentelemetry/instrumentation-long-task": import('@opentelemetry/instrumentation-long-task').LongtaskInstrumentationConfig;
 *  "@opentelemetry/instrumentation-user-interaction": import('@opentelemetry/instrumentation-user-interaction').UserInteractionInstrumentationConfig;
 *  "@opentelemetry/instrumentation-xml-http-request": import('@opentelemetry/instrumentation-xml-http-request').XMLHttpRequestInstrumentationConfig;
 *  "@opentelemetry/instrumentation-web-exception": import('@opentelemetry/instrumentation-web-exception').GlobalErrorsInstrumentationConfig;
 *  "@opentelemetry/instrumentation-web-vitals": import('@opentelemetry/instrumentation').InstrumentationConfig & import('./instrumentations/web-vitals.js').WebVitalsInstrumentationConfig
 * }} InstrumentationsConfigMap
 */

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
 * @property {Partial<InstrumentationsConfigMap>} [instrumentations]
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
 * @returns {{
 *      forceFlush: () => Promise<void>
 * }}
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
    const tracesEndpoint = appendPath(endpointUrl, 'v1/traces').href;
    const spanProcessor = new BatchSpanProcessor(
        new OTLPTraceExporter({
            url: tracesEndpoint,
            headers: config.exportHeaders,
        })
    );
    const tracerProvider = new WebTracerProvider({
        resource,
        sampler: new TraceIdRatioBasedSampler(config.sampleRate),
        spanProcessors: [spanProcessor],
    });
    // TODO: WebTracerProvider comes with
    // - a composite propagator [W3C, Baggage]
    // - a context manager (Stack, which has issues with exporters)
    // Should we allow users to pass their own propagator, contextmanager?
    tracerProvider.register({
        contextManager: AsyncApisContextManager,
    });
    // ideally it shoud be
    // trace.setGlobalTracerProvider(tracerProvider);
    // but there is no way to set propagators and context manager

    // metrics signal configuration
    const metricsEndpoint = appendPath(endpointUrl, 'v1/metrics').href;
    const metricsReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: metricsEndpoint,
            headers: config.exportHeaders,
        }),
    });
    const meterProvider = new MeterProvider({
        resource,
        readers: [metricsReader],
    });
    metrics.setGlobalMeterProvider(meterProvider);

    // logs signal configuration
    const logsEndpoint = appendPath(endpointUrl, 'v1/logs').href;
    const logsProcessor = new BatchLogRecordProcessor(
        new OTLPLogExporter({
            url: logsEndpoint,
            headers: config.exportHeaders,
        })
    );
    const loggerProvider = new LoggerProvider({
        resource,
        processors: [logsProcessor],
    });
    logs.setGlobalLoggerProvider(loggerProvider);

    // Resgister instrumentations. The `registerInstrumentations` enabled all of them
    // regardless of the configuration so EDOT only add the ones that are not disabled
    // by configuration
    /** @type {Record<keyof InstrumentationsConfigMap, (cfg: any) => any>} */
    const instrFactories = {
        '@opentelemetry/instrumentation-document-load': (cfg) =>
            new DocumentLoadInstrumentation(cfg),
        '@opentelemetry/instrumentation-fetch': (cfg) =>
            new FetchInstrumentation(cfg),
        '@opentelemetry/instrumentation-long-task': (cfg) =>
            new LongTaskInstrumentation(cfg),
        '@opentelemetry/instrumentation-user-interaction': (cfg) =>
            new UserInteractionInstrumentation(cfg),
        '@opentelemetry/instrumentation-xml-http-request': (cfg) =>
            new XMLHttpRequestInstrumentation(cfg),
        '@opentelemetry/instrumentation-web-exception': (cfg) =>
            new ExceptionInstrumentation(cfg),
        '@opentelemetry/instrumentation-web-vitals': (cfg) =>
            new WebVitalsInstrumentation(cfg),
    };

    const httpSemconvConfig = { semconvStabilityOptIn: 'http' };
    const instrumentations = config.instrumentations || {};
    const enabledInstrumentations = [];
    for (const key of Object.keys(instrFactories)) {
        let instrConfig = instrumentations[key];
        if (
            key === '@opentelemetry/instrumentation-fetch' ||
            key === '@opentelemetry/instrumentation-xml-http-request'
        ) {
            instrConfig = { ...httpSemconvConfig, ...instrConfig };
        }
        
        const isDisabled = instrConfig?.enabled === false;
        if (!isDisabled) {
            enabledInstrumentations.push(instrFactories[key](instrConfig));
        }
    }
    registerInstrumentations({instrumentations: enabledInstrumentations});

    // Flag as started
    sdkStarted = true;

    return {
        forceFlush() {
            return Promise.all([
                tracerProvider.forceFlush(),
                meterProvider.forceFlush(),
                loggerProvider.forceFlush(),
            ]).then(() => {});
        },
    };
}

// -- helper functions

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
