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
import {ConsoleInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/console';
import {UserActionInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/user-action';

import {AsyncApisContextManager} from './context.js';
import {createLogger} from './logging.js';
import {detectResource} from './detector.js';
import {
    checkRotation,
    closeSession,
    getSessionId,
    initSession,
    setSessionOnRotate,
} from './session.js';
import {pauseReplay, resumeReplay, startReplay, stopReplay} from './replay.js';
import {exceptionAttributes, SessionLogProcessor, SessionSpanProcessor} from './enrichment.js';
import {startFrustration, stopFrustration} from './frustration.js';
import {clearUser, setUser} from './user.js';
import {
    configureCapture,
    graphqlFromFetchRequest,
    parseGraphqlOperation,
    pauseCapture,
    resumeCapture,
    setLastUserAction,
    toIgnoreUrlList,
} from './capture.js';
import {applyWebVitalAttribution} from './vitals.js';
import {stampResourceTiming} from './timing.js';
import {wrapExporter} from './exporter.js';

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
 *  "console": import('@opentelemetry/browser-instrumentation/experimental/console').ConsoleInstrumentationConfig;
 *  "userAction": import('@opentelemetry/browser-instrumentation/experimental/user-action').UserActionInstrumentationConfig;
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
 * // session lifecycle
 * @property {SessionConfiguration} [session]
 *
 * // experimental session replay (POC)
 * @property {ReplayConfiguration} [replay]
 *
 * // capture control / privacy
 * @property {import('./capture.js').CaptureConfiguration} [capture]
 */

/**
 * @typedef {Object} SessionConfiguration
 * @property {number} [maxMs] // default 14 minutes
 * @property {number} [idleMs] // default 30 minutes
 * @property {boolean} [persistSession] // cookie vs sessionStorage; default false
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
 * @property {number} [maxChunkBytes]
 * @property {{mousemove?: number, scroll?: number, input?: string, canvas?: number}} [sampling]
 */

/**
 * Experimental session replay options (POC). Off by default.
 * @typedef {Object} ReplayConfiguration
 * @property {boolean} [enabled]
 * @property {number} [samplingRate] // 0-100, default 100
 * @property {number} [errorSamplingRate] // 0-100, default 100; >0 enables error backfill
 * @property {ReplayPrivacyConfiguration} [privacy]
 * @property {ReplayQualityConfiguration} [quality]
 * @property {{mousemove?: number, scroll?: number, input?: string, canvas?: number}} [sampling]
 * @property {number} [flushIntervalMs] // replay OTLP batch delay; default 1000
 * @property {number} [maxChunkBytes]
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
 *      pause: () => void,
 *      resume: () => void,
 *      sessionId: string | null,
 *      setUser: typeof setUser,
 *      clearUser: typeof clearUser,
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
    configureCapture(config.capture);

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

    // Session id is independent of Session Replay — stamp it on all signals.
    /** @type {string} */
    const sessionId = initSession(config.session);
    setSessionOnRotate((newId) => {
        diag.debug('Session id rotated', newId);
    });
    const resource = detectResource(
        {
            ...config.resourceAttributes,
            'session.id': sessionId,
            'rum.sessionId': sessionId,
        },
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
        exporter: wrapExporter(
            new OTLPTraceExporter({
                url: tracesEndpoint,
                headers: config.exportHeaders,
            })
        ),
    });
    const tracerProvider = new TracerProvider({
        resource,
        sampler: new TraceIdRatioBasedSampler(config.sampleRate),
        spanProcessors: [new SessionSpanProcessor(), spanProcessor],
    });
    trace.setGlobalTracerProvider(tracerProvider);

    // metrics signal configuration
    const metricsEndpoint = appendPath(endpointUrl, 'v1/metrics').href;
    const metricsReader = new PeriodicExportingMetricReader({
        exporter: wrapExporter(
            new OTLPMetricExporter({
                url: metricsEndpoint,
                headers: config.exportHeaders,
            })
        ),
    });
    const meterProvider = new MeterProvider({
        resource,
        readers: [metricsReader],
    });
    metrics.setGlobalMeterProvider(meterProvider);

    // logs signal configuration
    const logsEndpoint = appendPath(endpointUrl, 'v1/logs').href;
    const logsProcessor = new BatchLogRecordProcessor({
        exporter: wrapExporter(
            new OTLPLogExporter({
                url: logsEndpoint,
                headers: config.exportHeaders,
            }),
            'log'
        ),
    });
    const loggerProvider = new LoggerProvider({
        resource,
        processors: [new SessionLogProcessor(), logsProcessor],
    });
    logs.setGlobalLoggerProvider(loggerProvider);

    // Resgister instrumentations. The `registerInstrumentations` enabled all of them
    // regardless of the configuration so EDOT only add the ones that are not disabled
    // by configuration
    const ignoreUrls = toIgnoreUrlList(config.capture?.ignoreUrls);

    /** @type {Record<keyof InstrumentationsConfigMap, (cfg: any) => any>} */
    const instrFactories = {
        '@opentelemetry/instrumentation-browser-navigation': (cfg) =>
            new BrowserNavigationInstrumentation(cfg),
        '@opentelemetry/instrumentation-document-load': (cfg) =>
            new DocumentLoadInstrumentation({
                ...cfg,
                applyCustomAttributesOnSpan: {
                    ...cfg?.applyCustomAttributesOnSpan,
                    resourceFetch: (span, resource) => {
                        stampResourceTiming(span, resource, resource?.name);
                        cfg?.applyCustomAttributesOnSpan?.resourceFetch?.(
                            span,
                            resource
                        );
                    },
                },
            }),
        '@opentelemetry/instrumentation-fetch': (cfg) =>
            new FetchInstrumentation({
                ...cfg,
                ignoreUrls: [...ignoreUrls, ...(cfg?.ignoreUrls ?? [])],
                applyCustomAttributesOnSpan: (span, request, result) => {
                    const reqUrl =
                        typeof Request !== 'undefined' &&
                        request instanceof Request
                            ? request.url
                            : undefined;
                    stampResourceTiming(span, undefined, reqUrl);
                    const gql = graphqlFromFetchRequest(request, reqUrl);
                    if (gql) {
                        span.setAttribute('graphql.operation.name', gql.name);
                        span.setAttribute('graphql.operation.type', gql.type);
                    }
                    cfg?.applyCustomAttributesOnSpan?.(span, request, result);
                },
            }),
        '@opentelemetry/instrumentation-long-task': (cfg) =>
            new LongTaskInstrumentation({
                ...cfg,
                observerCallback: (span, info) => {
                    const src = info?.longtaskEntry?.attribution?.[0]?.containerSrc;
                    if (src) {
                        span.setAttribute('longtask.script_source', src);
                    }
                    cfg?.observerCallback?.(span, info);
                },
            }),
        '@opentelemetry/instrumentation-user-interaction': (cfg) =>
            new UserInteractionInstrumentation({
                eventNames: ['click', 'submit'],
                ...cfg,
            }),
        '@opentelemetry/instrumentation-xml-http-request': (cfg) =>
            new XMLHttpRequestInstrumentation({
                ...cfg,
                ignoreUrls: [...ignoreUrls, ...(cfg?.ignoreUrls ?? [])],
                applyCustomAttributesOnSpan: (span, xhr) => {
                    const url = xhr?.responseURL;
                    stampResourceTiming(span, undefined, url);
                    const gql = parseGraphqlOperation(undefined, url);
                    if (gql) {
                        span.setAttribute('graphql.operation.name', gql.name);
                        span.setAttribute('graphql.operation.type', gql.type);
                    }
                    cfg?.applyCustomAttributesOnSpan?.(span, xhr);
                },
            }),
        '@opentelemetry/instrumentation-web-exception': (cfg) =>
            new ExceptionInstrumentation({
                ...cfg,
                applyCustomAttributes: (error) => ({
                    ...exceptionAttributes(error),
                    ...(cfg?.applyCustomAttributes?.(error) ?? {}),
                }),
            }),
        '@opentelemetry/instrumentation-web-vitals': (cfg) =>
            new WebVitalsInstrumentation({
                includeRawAttribution: true,
                ...cfg,
                applyCustomLogRecordData: (logRecord) => {
                    applyWebVitalAttribution(logRecord);
                    cfg?.applyCustomLogRecordData?.(logRecord);
                },
            }),
        userAction: (cfg) =>
            new UserActionInstrumentation({
                ...cfg,
                applyCustomLogRecordData: (logRecord) => {
                    const selector = logRecord.attributes?.['browser.css_selector'];
                    const id =
                        typeof selector === 'string' && selector
                            ? selector
                            : `click-${Date.now()}`;
                    setLastUserAction(
                        id,
                        typeof selector === 'string' ? selector : 'click'
                    );
                    cfg?.applyCustomLogRecordData?.(logRecord);
                },
            }),
        console: (cfg) =>
            new ConsoleInstrumentation({
                logMethods: ['error', 'warn'],
                ...cfg,
            }),
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
    startFrustration();

    const replayCfg = resolveReplayConfig(config.replay);
    /** @type {import('@opentelemetry/sdk-logs').LoggerProvider | null} */
    let replayLoggerProvider = null;
    /** @type {Promise<void>} */
    let replayReady = Promise.resolve();

    if (replayCfg.enabled) {
        // Elastic Synthetics injects syntheticsRunId. Do not use
        // navigator.webdriver — Playwright (and other automation) sets it
        // and would skip replay in smoke tests.
        // @ts-ignore synthetics injects this global when present
        const isSynthetic = globalThis.syntheticsRunId != null;

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
                    new SessionLogProcessor(),
                    new BatchLogRecordProcessor({
                        exporter: wrapExporter(
                            new OTLPLogExporter({
                                url: logsEndpoint,
                                headers: config.exportHeaders,
                            }),
                            'log'
                        ),
                        scheduledDelayMillis: replayCfg.flushIntervalMs,
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
                sampling: replayCfg.sampling,
                maxChunkBytes: replayCfg.maxChunkBytes,
            }).catch((err) => {
                diag.warn('startReplay failed; replay disabled', err);
            });
        } else {
            diag.debug('Replay skipped for synthetic monitor');
        }
    }

    const onHidden = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            tracerProvider.forceFlush();
            meterProvider.forceFlush();
            loggerProvider.forceFlush();
            replayLoggerProvider?.forceFlush();
        }
    };
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onHidden);
    }

    const pauseAll = () => {
        pauseCapture();
        pauseReplay();
    };
    const resumeAll = () => {
        resumeCapture();
        resumeReplay();
    };

    // Flag as started
    sdkStarted = true;

    return {
        get sessionId() {
            return getSessionId();
        },
        setUser,
        clearUser,
        pauseReplay,
        resumeReplay,
        pause: pauseAll,
        resume: resumeAll,
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
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onHidden);
            }
            stopFrustration();
            stopReplay();
            closeSession();
            clearUser();
            resumeCapture();
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
 *   quality: Required<Pick<ReplayQualityConfiguration, 'inlineStylesheet' | 'collectFonts' | 'slimDOM' | 'recordCanvas' | 'packEvents'>> & ReplayQualityConfiguration,
 *   sampling: {mousemove: number, scroll: number, input: string, canvas: number},
 *   flushIntervalMs: number,
 *   maxChunkBytes: number,
 * }}
 */
function resolveReplayConfig(replay) {
    return {
        enabled: replay?.enabled === true,
        samplingRate: replay?.samplingRate ?? 100,
        errorSamplingRate: replay?.errorSamplingRate ?? 100,
        flushIntervalMs: replay?.flushIntervalMs ?? 1000,
        maxChunkBytes: replay?.maxChunkBytes ?? replay?.quality?.maxChunkBytes,
        sampling: {
            mousemove: replay?.sampling?.mousemove ?? 50,
            scroll: replay?.sampling?.scroll ?? 150,
            input: replay?.sampling?.input ?? 'last',
            canvas: replay?.sampling?.canvas ?? 2,
        },
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
            maxChunkBytes: replay?.quality?.maxChunkBytes,
            sampling: replay?.quality?.sampling,
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
