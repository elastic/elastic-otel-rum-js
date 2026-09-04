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
import {NavigationInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/navigation';
import {DocumentLoadInstrumentation} from '@opentelemetry/instrumentation-document-load';
import {FetchInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/fetch';
import {LongTaskInstrumentation} from '@opentelemetry/instrumentation-long-task';
import {UserInteractionInstrumentation} from '@opentelemetry/instrumentation-user-interaction';
import {XhrInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/xhr';
import {ErrorsInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/errors';
import {WebVitalsInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/web-vitals';

import {AsyncApisContextManager} from './context.js';
import {createLogger} from './logging.js';
import {detectResource} from './detector.js';

/**
 * @typedef {{
 *  "navigation": import('@opentelemetry/browser-instrumentation/experimental/navigation').NavigationInstrumentationConfig;
 *  "@opentelemetry/instrumentation-document-load": import('@opentelemetry/instrumentation-document-load').DocumentLoadInstrumentationConfig;
 *  "fetch": import('@opentelemetry/browser-instrumentation/experimental/fetch').FetchInstrumentationConfig;
 *  "@opentelemetry/instrumentation-long-task": import('@opentelemetry/instrumentation-long-task').LongtaskInstrumentationConfig;
 *  "@opentelemetry/instrumentation-user-interaction": import('@opentelemetry/instrumentation-user-interaction').UserInteractionInstrumentationConfig;
 *  "xhr": import('@opentelemetry/browser-instrumentation/experimental/xhr').XhrInstrumentationConfig;
 *  "errors": import('@opentelemetry/browser-instrumentation/experimental/errors').ErrorsInstrumentationConfig;
 *  "web-vitals": import('@opentelemetry/browser-instrumentation/experimental/web-vitals').WebVitalsInstrumentationConfig;
 * }} InstrumentationsConfigMap
 */

/**
 * Configuration that is defined in upstream SDK
 * @typedef {import('@opentelemetry/browser-sdk').RootConfig} SdkConfig
 */
/**
 * Configuration properties that are only in EDOT
 * @typedef {Object} EdotConfig
 * @property {number} [sampleRate] // defaults to 1
 * @property {Partial<InstrumentationsConfigMap>} [instrumentations]
 */
/**
 * @typedef {SdkConfig & EdotConfig} BrowserSdkConfiguration
 */

// SDK returned when invalid config or some error happens at start
const NOOP_SDK = {shutdown: () => Promise.resolve()};

// To control multiple calls to `startBrowserSdk`
let sdkStarted = false;

/** @typedef {'logLevel' | 'serviceName' | 'resourceAttributes' | 'sampleRate' | 'exportConfig'} DefaultConfigProps*/
/** @type {Required<Pick<BrowserSdkConfiguration, DefaultConfigProps>>} */
const defaultConfig = {
    logLevel: 'INFO',
    sampleRate: 1,
    serviceName: 'unknown_service:web',
    resourceAttributes: {},
    exportConfig: {
        url: 'http://localhost:4318',
    },
};

/**
 * @param {BrowserSdkConfiguration} cfg
 * @returns {{
 *      shutdown: () => Promise<void>;
 * }}
 */
export function startBrowserSdk(cfg = {}) {
    if (sdkStarted || cfg.disabled) {
        return NOOP_SDK;
    }

    // The upstream SDKs already set a logger but we want to print
    // some messages before using them. We need to setup our own
    // logger and disable it before starting logs/traces to avoid
    // the override message from old and new logger
    /** @type {keyof typeof import('@opentelemetry/api').DiagLogLevel} */
    // @ts-expect-error - we handle any other string that is not a log level
    const logLevel = (cfg.logLevel ?? defaultConfig.logLevel).toUpperCase();
    diag.setLogger(createLogger({logLevel}), {logLevel: DiagLogLevel.ALL});
    diag.debug(`Browser SDK intialization`, cfg);

    const {serviceName, serviceVersion} = cfg;
    const config = {...defaultConfig, ...cfg};

    // Input validation
    /** @type {URL} */
    let endpointUrl;
    try {
        endpointUrl = new URL(config?.exportConfig?.url || '');
    } catch (urlErr) {
        diag.error(
            `The value "${config?.exportConfig?.url}" for "exportConfig.url" configuration is not an URL. SDK won't start.`
        );
        return NOOP_SDK;
    }

    // Detect resource
    const resourceAttributes = detectResource(
        config.resourceAttributes,
        serviceName,
        serviceVersion
    );

    // Disable our logger to let the upstream take its place
    // TODO: if upstream exports its method to register a logger
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
            headers: config.exportConfig.headers,
        },
    });
    const tracerProvider = trace.getTracerProvider();

    const logsSdk = startLogsSdk({
        logLevel,
        resourceAttributes,
        exportConfig: {
            url: appendPath(endpointUrl, 'v1/logs').href,
            headers: config.exportConfig.headers,
        },
    });
    const loggerProvider = logs.getLoggerProvider();

    // metrics signal configuration
    // possible `startMetricsSdk` function
    const metricsReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: appendPath(endpointUrl, 'v1/metrics').href,
            headers: config.exportConfig.headers,
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
        navigation: (cfg) => new NavigationInstrumentation(cfg),
        '@opentelemetry/instrumentation-document-load': (cfg) =>
            new DocumentLoadInstrumentation(cfg),
        fetch: (cfg) => new FetchInstrumentation(cfg),
        '@opentelemetry/instrumentation-long-task': (cfg) =>
            new LongTaskInstrumentation(cfg),
        '@opentelemetry/instrumentation-user-interaction': (cfg) =>
            new UserInteractionInstrumentation(cfg),
        xhr: (cfg) => new XhrInstrumentation(cfg),
        errors: (cfg) => new ErrorsInstrumentation(cfg),
        'web-vitals': (cfg) => new WebVitalsInstrumentation(cfg),
    };

    const instrumentations = config.instrumentations || {};
    const enabledInstrumentations = [];

    /** @type {Array<keyof InstrumentationsConfigMap>} */
    // @ts-expect-error - the object defined above only has the allowed keys
    const instrKeys = Object.keys(instrFactories);

    for (const key of instrKeys) {
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
