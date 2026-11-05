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
    createSessionManager,
    resolveActivityEvents,
    SessionLogRecordProcessor,
    SessionSpanProcessor,
    trackUserActivity,
} from './session.js';
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
 * @property {{url?: string; headers?: Record<string, string>}} [exportConfig]
 */

/**
 * Configuration properties that are only in EDOT
 * @typedef {Object} EdotConfig
 * @property {Partial<InstrumentationsConfigMap>} [instrumentations]
 * @property {import('./session.js').SessionConfig} [session]
 */
/**
 * @typedef {SdkConfig & EdotConfig} BrowserSdkConfiguration
 */

const EDOT_SCOPE_NAME = '@elastic/opentelemetry-browser';

/**
 * @param {string} version
 * @returns {string}
 */
const instrumentationDocsUrl = (version) =>
    `https://github.com/open-telemetry/opentelemetry-browser/tree/browser-instrumentation-v${version}/packages/instrumentation#readme`;

// SDK returned when invalid config or some error happens at start
const NOOP_SDK = {shutdown: () => Promise.resolve()};

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

    const tracesUrl = appendPath(endpointUrl, 'v1/traces').href;
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
            if (sessionManager.getSession()?.sampled) {
                return {decision: 2};
            }
            return {decision: 0};
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

    const logsUrl = appendPath(endpointUrl, 'v1/logs').href;
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

            const enableFn = logger.enabled;
            logger.enabled = function () {
                const session = sessionManager.getSession();
                return session ? session.sampled : enableFn.call(this);
            };
            loggers.add(logger);
            return logger;
        };
    }

    // metrics signal configuration
    // possible `startMetricsSdk` function
    const metricsUrl = appendPath(endpointUrl, 'v1/metrics').href;
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

    // Factory functions for each instrumentation so it can resolve 1st which configuration
    // goes to which instrumentation
    /** @type {Record<keyof InstrumentationsConfigMap, (cfg: any) => any>} */
    const instrFactories = {
        navigation: (cfg) => new NavigationInstrumentation(cfg),
        'navigation-timing': (cfg) => new NavigationTimingInstrumentation(cfg),
        'resource-timing': (cfg) => {
            // This intrumentation must gnore export URLs.
            // ref: https://github.com/elastic/elastic-otel-rum-js/issues/108
            const config = cfg ?? {};
            if (Array.isArray(config.ignoreUrls)) {
                config.ignoreUrls.push(tracesUrl, logsUrl, metricsUrl);
            } else {
                config.ignoreUrls = [tracesUrl, logsUrl, metricsUrl];
            }
            return new ResourceTimingInstrumentation(config);
        },
        fetch: (cfg) => new FetchInstrumentation(cfg),
        'user-action': (cfg) => new UserActionInstrumentation(cfg),
        xhr: (cfg) => new XhrInstrumentation(cfg),
        errors: (cfg) => new ErrorsInstrumentation(cfg),
        'web-vitals': (cfg) => new WebVitalsInstrumentation(cfg),
    };

    // Configuring instrumentations manually has some risks since they are under
    // active development and future releases may break configuration. Let's warn
    if (typeof config.instrumentations !== 'undefined') {
        const docsUrl = instrumentationDocsUrl(
            OTEL_BROWSER_INSTRUMENTATION_VERSION
        );
        diag.warn(
            `Manual configuration of instrumetations is not recommended. The current options supported are documented in ${docsUrl}`
        );
    }
    const instrumentations = config.instrumentations || {};

    /** @type {Array<keyof InstrumentationsConfigMap>} */
    // @ts-expect-error - the object defined above only has the allowed keys
    const instrKeys = Object.keys(instrFactories);

    // Create all instrumentations
    /** @type {Array<import('@opentelemetry/instrumentation').Instrumentation>} */
    const instrumentationInstances = instrKeys.map((key) => {
        const config = instrumentations[key];
        return instrFactories[key](config);
    });

    // Does the same as `registerInstrumentations` from upstream. But at the
    // end disables the ones with { enabled: false } in configuration
    for (const instr of instrumentationInstances) {
        const config = instr.getConfig();
        instr.setLoggerProvider?.(loggerProvider);
        instr.setTracerProvider(tracerProvider);
        instr.setMeterProvider(meterProvider);
        instr.enable();
        if (config.enabled === false) {
            instr.disable();
        }
    }

    // Flag as started
    sdkStarted = true;

    return {
        shutdown() {
            stopActivityTracking?.();
            sessionManager?.shutdown();
            instrumentationInstances.forEach((i) => i.disable());
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
