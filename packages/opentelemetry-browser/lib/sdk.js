/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag, DiagLogLevel, metrics, trace} from '@opentelemetry/api';
import {logs} from '@opentelemetry/api-logs';
import {startLogsSdk} from '@opentelemetry/browser-sdk/logs';
import {startTracesSdk} from '@opentelemetry/browser-sdk/traces';
import {OTLPMetricExporter} from '@opentelemetry/exporter-metrics-otlp-http';
import {resourceFromAttributes} from '@opentelemetry/resources';
import {
    MeterProvider,
    PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import {TraceIdRatioBasedSampler} from '@opentelemetry/sdk-trace';

import {registerInstrumentations} from '@opentelemetry/instrumentation';
import {BrowserNavigationInstrumentation} from '@opentelemetry/instrumentation-browser-navigation';
import {DocumentLoadInstrumentation} from '@opentelemetry/instrumentation-document-load';
import {FetchInstrumentation} from '@opentelemetry/instrumentation-fetch';
import {LongTaskInstrumentation} from '@opentelemetry/instrumentation-long-task';
import {UserInteractionInstrumentation} from '@opentelemetry/instrumentation-user-interaction';
import {XMLHttpRequestInstrumentation} from '@opentelemetry/instrumentation-xml-http-request';
import {ExceptionInstrumentation} from '@opentelemetry/instrumentation-web-exception';
import {WebVitalsInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/web-vitals';

import {AsyncApisContextManager} from './context.js';
import {createLogger} from './logging.js';
import {detectResource} from './detector.js';

/**
 * @typedef {{
 *  "@opentelemetry/instrumentation-browser-navigation": import('@opentelemetry/instrumentation-browser-navigation').BrowserNavigationInstrumentationConfig;
 *  "@opentelemetry/instrumentation-document-load": import('@opentelemetry/instrumentation-document-load').DocumentLoadInstrumentationConfig;
 *  "@opentelemetry/instrumentation-fetch": import('@opentelemetry/instrumentation-fetch').FetchInstrumentationConfig;
 *  "@opentelemetry/instrumentation-long-task": import('@opentelemetry/instrumentation-long-task').LongtaskInstrumentationConfig;
 *  "@opentelemetry/instrumentation-user-interaction": import('@opentelemetry/instrumentation-user-interaction').UserInteractionInstrumentationConfig;
 *  "@opentelemetry/instrumentation-xml-http-request": import('@opentelemetry/instrumentation-xml-http-request').XMLHttpRequestInstrumentationConfig;
 *  "@opentelemetry/instrumentation-web-exception": import('@opentelemetry/instrumentation-web-exception').GlobalErrorsInstrumentationConfig;
 *  "@opentelemetry/instrumentation-web-vitals": import('@opentelemetry/browser-instrumentation/experimental/web-vitals').WebVitalsInstrumentationConfig;
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
 *      forceFlush: () => Promise<void>;
 *      shutdown: () => Promise<void>;
 * }}
 */
export function startBrowserSdk(cfg = {}) {
    if (sdkStarted || cfg.disabled) {
        return;
    }

    // The upstream SDKs already set a logger but we want to print
    // some messages before using them. We need to setup our own
    // logger and disable it before starting logs/traces to avoid
    // the override message from old and new logger
    /** @type {any} */
    const logLevel = (cfg.logLevel ?? defaultConfig.logLevel).toUpperCase();
    diag.setLogger(createLogger({logLevel}), {logLevel: DiagLogLevel.ALL});
    diag.debug(`Browser SDK intialization`, cfg);

    const {serviceName, serviceVersion} = cfg;
    const config = {...defaultConfig, ...cfg};

    // Input validation
    /** @type {URL} */
    let endpointUrl;
    try {
        endpointUrl = new URL(config?.otlpEndpoint);
    } catch (urlErr) {
        diag.error(
            `The value "${config.otlpEndpoint}" for "otlpEndpoint" configuration is not an URL. SDK won't start.`
        );
        return;
    }

    // Detect resource
    const resourceAttributes = detectResource(
        config.resourceAttributes,
        serviceName,
        serviceVersion
    );

    // Disable our logger to let the upstream take its place
    // TODO: if upstream exports its methid to register a logger
    // we could get rid of this
    diag.disable();

    // NOTE: export payloads can be seen in DevTools network tab in JSON format
    // so IMHO it would be redundant to use console exporters in traces signal
    const tracesSdk = startTracesSdk({
        logLevel,
        resourceAttributes,
        contextManager: AsyncApisContextManager.enable(),
        sampler: new TraceIdRatioBasedSampler(config.sampleRate),
        exportConfig: {
            url: appendPath(endpointUrl, 'v1/traces').href,
            headers: config.exportHeaders,
        },
    });
    const tracerProvider = trace.getTracerProvider();

    const logsSdk = startLogsSdk({
        logLevel,
        resourceAttributes,
        exportConfig: {
            url: appendPath(endpointUrl, 'v1/logs').href,
            headers: config.exportHeaders,
        },
    });
    const loggerProvider = logs.getLoggerProvider();

    // metrics signal configuration
    // possible `startMetricsSdk` function
    const metricsReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: appendPath(endpointUrl, 'v1/metrics').href,
            headers: config.exportHeaders,
        }),
    });
    const meterProvider = new MeterProvider({
        resource: resourceFromAttributes(resourceAttributes),
        readers: [metricsReader],
    });
    metrics.setGlobalMeterProvider(meterProvider);

    // Resgister instrumentations. The `registerInstrumentations` enabled all of them
    // regardless of the configuration so EDOT only add the ones that are not disabled
    // by configuration
    /** @type {Record<keyof InstrumentationsConfigMap, (cfg: any) => any>} */
    const instrFactories = {
        '@opentelemetry/instrumentation-browser-navigation': (cfg) =>
            new BrowserNavigationInstrumentation(cfg),
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

    const instrumentations = config.instrumentations || {};
    const enabledInstrumentations = [];
    for (const key of Object.keys(instrFactories)) {
        const instrConfig = instrumentations[key];
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
            return Promise.allSettled([
                // @ts-expect-error -- accesing private delegate
                tracerProvider._delegate.forceFlush(),
                // @ts-expect-error -- accesing private method
                loggerProvider.forceFlush(),
                meterProvider.forceFlush(),
            ]).then((results) => {
                for (const res of results) {
                    if (res.status === 'rejected') {
                        diag.warn(`Error flushing data. Reason: ${res.reason}`);
                    }
                }
            });
        },
        shutdown() {
            return Promise.allSettled([
                tracesSdk.shutdown(),
                logsSdk.shutdown(),
                meterProvider.shutdown(),
            ]).then((results) => {
                for (const res of results) {
                    if (res.status === 'rejected') {
                        diag.warn(
                            `Error shutting down SDK. Reason: ${res.reason}`
                        );
                    }
                }
            });
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
