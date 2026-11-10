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

import {NavigationInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/navigation';
import {NavigationTimingInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/navigation-timing';
import {ResourceTimingInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/resource-timing';
import {FetchInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/fetch';
import {UserActionInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/user-action';
import {XhrInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/xhr';
import {ErrorsInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/errors';
import {WebVitalsInstrumentation} from '@opentelemetry/browser-instrumentation/experimental/web-vitals';

import {AsyncApisContextManager} from './context.js';
import {createLogger} from './logging.js';
import {detectResource} from './detector.js';
import {
    ATTR_SESSION_ID,
    ATTR_SESSION_PREVIOUS_ID,
    EVENT_SESSION_START,
} from './semconv.js';
import {
    createSessionApi,
    createSessionManager,
    resolveActivityEvents,
    SessionLogRecordProcessor,
    SessionSpanProcessor,
    trackUserActivity,
} from './session.js';
import {isValidArray, resolveExportUrls} from './utils.js';
import {EDOT_VERSION, OTEL_BROWSER_INSTRUMENTATION_VERSION} from './version.js';

/**
 * @typedef {{
 *  "navigation": import('@opentelemetry/browser-instrumentation/experimental/navigation').NavigationInstrumentationConfig;
 *  "navigation-timing": import('@opentelemetry/browser-instrumentation/experimental/navigation-timing').NavigationTimingInstrumentationConfig;
 *  "resource-timing": import('@opentelemetry/browser-instrumentation/experimental/resource-timing').ResourceTimingInstrumentationConfig;
 *  "fetch": import('@opentelemetry/browser-instrumentation/experimental/fetch').FetchInstrumentationConfig;
 *  "user-action": import('@opentelemetry/browser-instrumentation/experimental/user-action').UserActionInstrumentationConfig;
 *  "xhr": import('@opentelemetry/browser-instrumentation/experimental/xhr').XhrInstrumentationConfig;
 *  "errors": import('@opentelemetry/browser-instrumentation/experimental/errors').ErrorsInstrumentationConfig;
 *  "web-vitals": import('@opentelemetry/browser-instrumentation/experimental/web-vitals').WebVitalsInstrumentationConfig;
 * }} InstrumentationsConfigMap
 */

/**
 * Configuration that is defined in upstream SDK
 * @typedef {Object} SdkConfig
 * @property {boolean} [disabled]
 * @property {Lowercase<keyof typeof import('@opentelemetry/api').DiagLogLevel>} [logLevel]
 * @property {string} [serviceName]
 * @property {string} [serviceVersion]
 * @property {import('@opentelemetry/api').Attributes} [resourceAttributes]
 * @property {{url?: string; tracesUrl?: string; logsUrl?: string; metricsUrl?: string; headers?: Record<string, string>}} [exportConfig]
 */

/**
 * Configuration properties that are only in EDOT
 * @typedef {Object} EdotConfig
 * @property {Partial<InstrumentationsConfigMap>} [instrumentations]
 * @property {import('./session.js').SessionConfig} [session]
 * @property {Array<string | RegExp>} [ignoreFetchUrls]
 * @property {Array<keyof InstrumentationsConfigMap>} [disableInstrumentations]
 */
/**
 * @typedef {SdkConfig & EdotConfig} BrowserSdkConfiguration
 */

const EDOT_SCOPE_NAME = '@elastic/opentelemetry-browser';

/**
 * @typedef {Object} BrowserSdk
 * @property {() => Promise<void>} shutdown
 * @property {import('./session.js').SessionApi['getSession']} getSession
 * @property {import('./session.js').SessionApi['addObserver']} addObserver
 * @property {import('./session.js').SessionApi['endSession']} endSession
 */

/**
 * @param {string} version
 * @returns {string}
 */
const instrumentationDocsUrl = (version) =>
    `https://github.com/open-telemetry/opentelemetry-browser/tree/browser-instrumentation-v${version}/packages/instrumentation#readme`;

// SDK returned when invalid config or some error happens at start
/** @type {BrowserSdk} */
const NOOP_SDK = {
    shutdown: () => Promise.resolve(),
    ...createSessionApi(undefined),
};

// To control multiple calls to `startBrowserSdk`
let sdkStarted = false;

/** @typedef { 'logLevel' | 'serviceName' | 'resourceAttributes' | 'exportConfig'} DefaultConfigProps*/
/** @type {Required<Pick<BrowserSdkConfiguration, DefaultConfigProps>>} */
const defaultConfig = {
    logLevel: 'info',
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
    // @ts-expect-error - `createLogger` handles upercasing and wrong values
    const logLevel = cfg.logLevel ?? defaultConfig.logLevel;
    diag.setLogger(createLogger({logLevel}), {logLevel: DiagLogLevel.ALL});
    diag.debug(`Browser SDK intialization`, cfg);

    const {serviceName, serviceVersion} = cfg;
    const config = {...defaultConfig, ...cfg};

    // Input validation
    // - endpoint
    /** @type {ReturnType<typeof resolveExportUrls>} */
    let exportUrls;
    try {
        exportUrls = resolveExportUrls(config.exportConfig);
    } catch (urlErr) {
        diag.error(`${/** @type {Error} */ (urlErr).message} SDK won't start.`);
        return NOOP_SDK;
    }
    const {tracesUrl, logsUrl, metricsUrl} = exportUrls;
    // - ignoreFetchUrls and resolving all URLs to ignore
    /** @type {Array<string | RegExp>} */
    const ignoreFetchUrls = [tracesUrl, logsUrl, metricsUrl];
    if (config.ignoreFetchUrls) {
        /**
         * @param {unknown} i
         * @returns {boolean}
         */
        const isValidIgnore = (i) =>
            typeof i === 'string' || i instanceof RegExp;
        if (isValidArray(config.ignoreFetchUrls, isValidIgnore)) {
            ignoreFetchUrls.push(...config.ignoreFetchUrls);
        } else {
            diag.error(
                `The value "${config.ignoreFetchUrls}" for "ignoreFetchUrls" configuration is not valid. SDK won't start.`
            );
            return NOOP_SDK;
        }
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

    const edotLogger = logs.getLogger(EDOT_SCOPE_NAME, EDOT_VERSION);
    const sessionManager = createSessionManager(config.session);
    sessionManager?.addObserver({
        onSessionStarted(session) {
            // Tabs sharing the session are told too, only its creator reports it
            if (!session.sampled || !sessionManager.isCreatedHere(session.id)) {
                return;
            }
            /** @type {import('@opentelemetry/api').Attributes} */
            const attributes = {[ATTR_SESSION_ID]: session.id};
            if (session.previousId) {
                attributes[ATTR_SESSION_PREVIOUS_ID] = session.previousId;
            }
            edotLogger.emit({
                eventName: EVENT_SESSION_START,
                attributes,
            });
        },
    });

    const spanProcessors = [];
    // By default the Span sampler is allways on
    /** @type {(...args: any[]) => import('@opentelemetry/sdk-trace').SamplingResult} */
    let shouldSample = () => ({decision: 2});

    // Some of the traces configuration depend if we can provide sessions. If so:
    // - add a processor to append session attributes
    // - span sampling is decided by the session sampling
    if (sessionManager) {
        spanProcessors.push(
            new SessionSpanProcessor({
                manager: sessionManager,
            })
        );
        shouldSample = () => {
            const session = sessionManager.getSession();
            const isSampled = session
                ? session.sampled
                : sessionManager.exportsWithoutSession();
            return {decision: isSampled ? 2 : 0};
        };
    }

    // NOTE: export payloads can be seen in DevTools network tab in JSON format
    // so IMHO it would be redundant to use console exporters in traces signal
    const tracesSdk = startTracesSdk({
        logLevel,
        resourceAttributes,
        contextManager: AsyncApisContextManager.enable(),
        processors: spanProcessors,
        sampler: {shouldSample},
        exportConfig: {
            url: tracesUrl,
            headers: config.exportConfig.headers,
        },
    });
    // this will be used later for instrumentations
    const tracerProvider = trace.getTracerProvider();

    const logProcessors = [];
    // Some of the logs configuration depend if we can provide sessions. If so:
    // - add a processor to append session attributes
    // - add a configurator to enable/disable when session is sampled or not
    if (sessionManager) {
        logProcessors.push(
            new SessionLogRecordProcessor({
                manager: sessionManager,
            })
        );
    }
    const logsSdk = startLogsSdk({
        logLevel,
        resourceAttributes,
        processors: logProcessors,
        exportConfig: {
            url: logsUrl,
            headers: config.exportConfig.headers,
        },
    });
    // this will be used later for instrumentations
    const loggerProvider = logs.getLoggerProvider();

    // Maybe a better way to control the loggers would be to provide a `LoggerConfigurator`
    // but the `startLogsSdk` function does not offer the option to pass it through.
    // Solution for now is to wrap the `getLogger` method and patch the `enabled` method
    // so is aware of the session when called.
    if (sessionManager) {
        const loggers = new WeakSet();
        const loggerFn = loggerProvider.getLogger;
        loggerProvider.getLogger = function (name, version, options) {
            const logger = loggerFn.call(this, name, version, options);
            if (loggers.has(logger)) {
                return logger;
            }

            logger.enabled = function () {
                const session = sessionManager.getSession();
                return session
                    ? session.sampled
                    : sessionManager.exportsWithoutSession();
            };
            loggers.add(logger);
            return logger;
        };
    }

    // metrics signal configuration
    // possible `startMetricsSdk` function
    const metricsReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: metricsUrl,
            headers: config.exportConfig.headers,
        }),
    });
    const meterProvider = new MeterProvider({
        resource: resourceFromAttributes(resourceAttributes),
        readers: [metricsReader],
    });
    metrics.setGlobalMeterProvider(meterProvider);

    // Start eagerly so `session.start` is emitted on load rather than with
    // the first piece of telemetry.
    sessionManager?.start();
    const stopActivityTracking =
        sessionManager &&
        trackUserActivity(
            sessionManager,
            resolveActivityEvents(config.session)
        );

    // NOTE: metrics is different in semantics. depending on the user's inent:
    // - there could be metrics that outlive session limits
    // - there could be metrics attached to a session (sampled)
    //
    // The 1st type of metics are allways collected and exported with no session attributes and
    // the 2nd should have session attributes and should be reset/recreated whenever
    // a session starts. Also collection and export is tied to the sampling decision.
    // By doing nothing we have the 1st type of metrics. We should check how
    // to provide the 2nd type. A possible implementation could be to have API to create
    // proxy instruments that inject the session attributes and recretes on each new session
    // (proposed in https://github.com/open-telemetry/opentelemetry-browser/discussions/265)

    // Instrumentations configuration & enablement
    /** @param {{ignoreUrls?: any}} [cfg] */
    const withIgnoreUrls = (cfg) => {
        const ignoreUrls = [...ignoreFetchUrls];
        if (Array.isArray(cfg?.ignoreUrls)) {
            ignoreUrls.push(...cfg.ignoreUrls);
        }
        return {...cfg, ignoreUrls};
    };

    // Factory functions for each instrumentation so it can resolve 1st which configuration
    // goes to which instrumentation
    /** @type {Record<keyof InstrumentationsConfigMap, (cfg: any) => any>} */
    const instrFactoriesMap = {
        navigation: (cfg) => new NavigationInstrumentation(cfg),
        'navigation-timing': (cfg) => new NavigationTimingInstrumentation(cfg),
        'resource-timing': (cfg) =>
            new ResourceTimingInstrumentation(withIgnoreUrls(cfg)),
        fetch: (cfg) => new FetchInstrumentation(withIgnoreUrls(cfg)),
        'user-action': (cfg) => new UserActionInstrumentation(cfg),
        xhr: (cfg) => new XhrInstrumentation(withIgnoreUrls(cfg)),
        errors: (cfg) => new ErrorsInstrumentation(cfg),
        'web-vitals': (cfg) => new WebVitalsInstrumentation(cfg),
    };

    /** @type {Set<string>} */
    const disableInstrumentations = new Set();
    if (config.disableInstrumentations) {
        // NOTE: we do not check all the items are valid instrumentation names because
        // a typo would mean nothing gets disabled. EDOT should do as much as it can
        if (
            isValidArray(
                config.disableInstrumentations,
                (i) => typeof i === 'string'
            )
        ) {
            config.disableInstrumentations.forEach((name) => {
                if (Object.hasOwn(instrFactoriesMap, name)) {
                    disableInstrumentations.add(name);
                } else {
                    diag.warn(
                        `Can't disable instrumentation with name "${name}". It is not in the list of available instrumentations`
                    );
                }
            });
        } else {
            diag.warn(
                `Configuration option "disableInstrumentations" must be an array of strings. Instead found "${config.disableInstrumentations}"`
            );
        }
    }

    const instrConfigType = typeof config.instrumentations;
    /** @type {Record<string, unknown>} */
    let instrConfigMap = {};

    // Configuring instrumentations manually has some risks since they are under
    // active development and future releases may break configuration. Let's warn
    if (instrConfigType !== 'undefined') {
        const docsUrl = instrumentationDocsUrl(
            OTEL_BROWSER_INSTRUMENTATION_VERSION
        );
        diag.warn(
            `Manual configuration of instrumentations is not recommended. The current options supported are documented in ${docsUrl}`
        );
        // If user passed the options check the type is correct. Do not check nested properties
        if (instrConfigType !== 'object') {
            diag.warn(
                `Configuration option "instrumentations" must be an object. Instead found "${config.instrumentations}"`
            );
        } else {
            instrConfigMap = {...config.instrumentations};
        }
    }

    const instrEntries = Object.entries(instrFactoriesMap).map(
        ([name, factory]) => {
            const instr = factory(instrConfigMap[name]);
            return {name, instr};
        }
    );

    // Does the same as `registerInstrumentations` form upstream at the end
    // disabling the ones with { enabled: false } in configuration or present
    // in `disableInstrumentations`
    for (const entry of instrEntries) {
        const {name, instr} = entry;
        instr.setLoggerProvider?.(loggerProvider);
        instr.setTracerProvider(tracerProvider);
        instr.setMeterProvider(meterProvider);
        instr.enable();
        if (
            disableInstrumentations.has(name) ||
            instr.getConfig().enabled === false
        ) {
            instr.disable();
        }
    }

    // Flag as started
    sdkStarted = true;

    return {
        ...createSessionApi(sessionManager),
        shutdown() {
            stopActivityTracking?.();
            sessionManager?.shutdown();
            instrEntries.forEach((e) => e.instr.disable());
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
