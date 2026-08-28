/**
 * @param {BrowserSdkConfiguration} cfg
 * @returns {{
 *      shutdown: () => Promise<void>;
 * }}
 */
export function startBrowserSdk(cfg?: BrowserSdkConfiguration): {
    shutdown: () => Promise<void>;
};
export type InstrumentationsConfigMap = {
    "navigation": import('@opentelemetry/browser-instrumentation/experimental/navigation').NavigationInstrumentationConfig;
    "@opentelemetry/instrumentation-document-load": import('@opentelemetry/instrumentation-document-load').DocumentLoadInstrumentationConfig;
    "fetch": import('@opentelemetry/browser-instrumentation/experimental/fetch').FetchInstrumentationConfig;
    "@opentelemetry/instrumentation-long-task": import('@opentelemetry/instrumentation-long-task').LongtaskInstrumentationConfig;
    "@opentelemetry/instrumentation-user-interaction": import('@opentelemetry/instrumentation-user-interaction').UserInteractionInstrumentationConfig;
    "xhr": import('@opentelemetry/browser-instrumentation/experimental/xhr').XhrInstrumentationConfig;
    "errors": import('@opentelemetry/browser-instrumentation/experimental/errors').ErrorsInstrumentationConfig;
    "web-vitals": import('@opentelemetry/browser-instrumentation/experimental/web-vitals').WebVitalsInstrumentationConfig;
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
    instrumentations?: Partial<InstrumentationsConfigMap>;
};
