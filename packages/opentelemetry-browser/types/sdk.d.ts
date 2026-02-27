/**
 * @param {BrowserSdkConfiguration} cfg
 * @returns {{
 *      providers: {
 *          tracer: import('@opentelemetry/api').TracerProvider;
 *          meter: import('@opentelemetry/api').MeterProvider;
 *          logger: import('@opentelemetry/api-logs').LoggerProvider;
 *      };
 *      flush: () => Promise<void>
 * }}
 */
export function startBrowserSdk(cfg?: BrowserSdkConfiguration): {
    providers: {
        tracer: import('@opentelemetry/api').TracerProvider;
        meter: import('@opentelemetry/api').MeterProvider;
        logger: import('@opentelemetry/api-logs').LoggerProvider;
    };
    flush: () => Promise<void>;
};
export type InstrumentationsConfigMap = {
    "@opentelemetry/instrumentation-document-load": import('@opentelemetry/instrumentation-document-load').DocumentLoadInstrumentationConfig;
    "@opentelemetry/instrumentation-fetch": import('@opentelemetry/instrumentation-fetch').FetchInstrumentationConfig;
    "@opentelemetry/instrumentation-long-task": import('@opentelemetry/instrumentation-long-task').LongtaskInstrumentationConfig;
    "@opentelemetry/instrumentation-user-interaction": import('@opentelemetry/instrumentation-user-interaction').UserInteractionInstrumentationConfig;
    "@opentelemetry/instrumentation-xml-http-request": import('@opentelemetry/instrumentation-xml-http-request').XMLHttpRequestInstrumentationConfig;
    "@opentelemetry/instrumentation-web-exception": import('@opentelemetry/instrumentation-web-exception').GlobalErrorsInstrumentationConfig;
};
export type BrowserSdkConfiguration = {
    disabled?: boolean;
    serviceName?: string;
    serviceVersion?: string;
    logLevel?: string;
    sampleRate?: number;
    resourceAttributes?: Record<string, import('./detector.js').AttributeValue>;
    otlpEndpoint?: string;
    /**
     * // other options
     */
    exportHeaders?: Record<string, string>;
    configInstrumentations?: Partial<InstrumentationsConfigMap>;
};
