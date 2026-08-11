/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    context,
    diag,
    DiagLogLevel,
    metrics,
    propagation,
    trace,
} from '@opentelemetry/api';
import {logs} from '@opentelemetry/api-logs';
import {
    CompositePropagator,
    W3CBaggagePropagator,
    W3CTraceContextPropagator,
} from '@opentelemetry/core';
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
    TracerProvider,
} from '@opentelemetry/sdk-trace';
import {resourceFromAttributes} from '@opentelemetry/resources';

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
import {
    checkRotation,
    closeSession,
    getSessionId,
    initSession,
} from './session.js';
import {pauseReplay, resumeReplay, startReplay, stopReplay} from './replay.js';

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
 *
 * // experimental session replay (POC)
 * @property {ReplayConfiguration} [replay]
 */

/**
 * @typedef {Object} ReplayPrivacyConfiguration
 * @property {boolean} [maskAllInputs]
 * @property {boolean} [maskAllText]
 * @property {string} [maskTextSelector]
 * @property {string} [blockSelector]
 * @property {string} [blockClass]
 * @property {string} [ignoreClass]
 * @property {Record<string, boolean>} [maskInputOptions]
 * @property {(text: string, element: HTMLElement) => string} [maskInputFn]
 */

/**
 * @typedef {Object} ReplayQualityConfiguration
 * @property {boolean} [inlineStylesheet]
 * @property {boolean} [collectFonts]
 * @property {boolean} [slimDOM]
 * @property {boolean} [recordCanvas]
 * @property {boolean} [packEvents]
 */

/**
 * Experimental session replay options (POC). Off by default.
 * @typedef {Object} ReplayConfiguration
 * @property {boolean} [enabled]
 * @property {number} [samplingRate] // 0-100, default 100
 * @property {number} [errorSamplingRate] // 0-100, default 100; >0 enables error backfill
 * @property {ReplayPrivacyConfiguration} [privacy]
 * @property {ReplayQualityConfiguration} [quality]
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
 *      forceFlush: () => Promise<void>,
 *      shutdown: () => Promise<void>,
 *      pauseReplay: () => void,
 *      resumeReplay: () => void,
 *      sessionId: string | null,
 * } | undefined}
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

    // Traces depend on context manager & propagation
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

    // traces signal configuration
    const tracesEndpoint = appendPath(endpointUrl, 'v1/traces').href;
    const spanProcessor = new BatchSpanProcessor({
        exporter: new OTLPTraceExporter({
            url: tracesEndpoint,
            headers: config.exportHeaders,
        }),
    });
    const tracerProvider = new TracerProvider({
        resource,
        sampler: new TraceIdRatioBasedSampler(config.sampleRate),
        spanProcessors: [spanProcessor],
    });
    trace.setGlobalTracerProvider(tracerProvider);

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
    const logsProcessor = new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
            url: logsEndpoint,
            headers: config.exportHeaders,
        }),
    });
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

    const httpSemconvConfig = {semconvStabilityOptIn: 'http'};
    const instrumentations = config.instrumentations || {};
    const enabledInstrumentations = [];
    for (const key of Object.keys(instrFactories)) {
        let instrConfig = instrumentations[key];
        if (
            key === '@opentelemetry/instrumentation-fetch' ||
            key === '@opentelemetry/instrumentation-xml-http-request'
        ) {
            instrConfig = {...httpSemconvConfig, ...instrConfig};
        }

        const isDisabled = instrConfig?.enabled === false;
        if (!isDisabled) {
            enabledInstrumentations.push(instrFactories[key](instrConfig));
        }
    }
    registerInstrumentations({instrumentations: enabledInstrumentations});

    const replayCfg = resolveReplayConfig(config.replay);
    /** @type {import('@opentelemetry/sdk-logs').LoggerProvider | null} */
    let replayLoggerProvider = null;
    /** @type {Promise<void>} */
    let replayReady = Promise.resolve();
    /** @type {string | null} */
    let sessionId = null;

    if (replayCfg.enabled) {
        // Elastic Synthetics injects syntheticsRunId. Do not use
        // navigator.webdriver — Playwright (and other automation) sets it
        // and would skip replay in smoke tests.
        // @ts-ignore synthetics injects this global when present
        const isSynthetic = globalThis.syntheticsRunId != null;

        sessionId = initSession();

        if (!isSynthetic) {
            // Dedicated provider avoids array-valued resource attrs (e.g. browser.brands)
            // that have historically broken large FullSnapshot log exports.
            const logsEndpoint = appendPath(endpointUrl, 'v1/logs').href;
            replayLoggerProvider = new LoggerProvider({
                resource: resourceFromAttributes({
                    'service.name':
                        config.serviceName ?? defaultConfig.serviceName,
                    'session.id': sessionId,
                    'rum.sessionId': sessionId,
                    'telemetry.distro.name': 'elastic',
                }),
                processors: [
                    new BatchLogRecordProcessor({
                        exporter: new OTLPLogExporter({
                            url: logsEndpoint,
                            headers: config.exportHeaders,
                        }),
                    }),
                ],
            });
            const replayLogger =
                replayLoggerProvider.getLogger('elastic-rrweb');
            replayReady = startReplay({
                samplingRate: replayCfg.samplingRate,
                errorSamplingRate: replayCfg.errorSamplingRate,
                replayLogger,
                getSessionId,
                checkRotation,
                privacy: replayCfg.privacy,
                quality: replayCfg.quality,
            }).catch((err) => {
                diag.warn('startReplay failed; replay disabled', err);
            });
        } else {
            diag.debug('Replay skipped for synthetic monitor');
        }
    }

    // Flag as started
    sdkStarted = true;

    return {
        get sessionId() {
            return sessionId ?? getSessionId();
        },
        pauseReplay,
        resumeReplay,
        forceFlush() {
            return replayReady.then(() =>
                Promise.all([
                    tracerProvider.forceFlush(),
                    meterProvider.forceFlush(),
                    loggerProvider.forceFlush(),
                    replayLoggerProvider?.forceFlush() ?? Promise.resolve(),
                ]).then(() => {})
            );
        },
        async shutdown() {
            await replayReady;
            stopReplay();
            closeSession();
            await Promise.all([
                tracerProvider.forceFlush(),
                meterProvider.forceFlush(),
                loggerProvider.forceFlush(),
                replayLoggerProvider?.forceFlush() ?? Promise.resolve(),
            ]);
            try {
                await replayLoggerProvider?.shutdown();
            } catch (err) {
                diag.warn('replay LoggerProvider shutdown failed', err);
            }
            sdkStarted = false;
        },
    };
}

/**
 * @param {ReplayConfiguration | undefined} replay
 * @returns {{
 *   enabled: boolean,
 *   samplingRate: number,
 *   errorSamplingRate: number,
 *   privacy: Required<Pick<ReplayPrivacyConfiguration, 'maskAllInputs' | 'maskAllText' | 'blockClass' | 'ignoreClass'>> & ReplayPrivacyConfiguration,
 *   quality: Required<Pick<ReplayQualityConfiguration, 'inlineStylesheet' | 'collectFonts' | 'slimDOM' | 'recordCanvas' | 'packEvents'>>,
 * }}
 */
function resolveReplayConfig(replay) {
    return {
        enabled: replay?.enabled === true,
        samplingRate: replay?.samplingRate ?? 100,
        errorSamplingRate: replay?.errorSamplingRate ?? 100,
        privacy: {
            maskAllInputs: replay?.privacy?.maskAllInputs ?? true,
            maskAllText: replay?.privacy?.maskAllText ?? false,
            maskTextSelector: replay?.privacy?.maskTextSelector,
            blockSelector: replay?.privacy?.blockSelector,
            blockClass: replay?.privacy?.blockClass ?? 'rum-block',
            ignoreClass: replay?.privacy?.ignoreClass ?? 'rum-ignore',
            maskInputOptions: replay?.privacy?.maskInputOptions,
            maskInputFn: replay?.privacy?.maskInputFn,
        },
        quality: {
            inlineStylesheet: replay?.quality?.inlineStylesheet ?? true,
            collectFonts: replay?.quality?.collectFonts ?? false,
            slimDOM: replay?.quality?.slimDOM ?? true,
            recordCanvas: replay?.quality?.recordCanvas ?? false,
            packEvents: replay?.quality?.packEvents ?? false,
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
