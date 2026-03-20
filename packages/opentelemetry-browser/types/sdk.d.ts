/**
 * @param {BrowserSdkConfiguration} cfg
 * @returns {{
 *      forceFlush: () => Promise<void>
 * }}
 */
export function startBrowserSdk(cfg?: BrowserSdkConfiguration): {
    forceFlush: () => Promise<void>;
};
export type InstrumentationsConfigMap = {
    "@opentelemetry/instrumentation-document-load": import('@opentelemetry/instrumentation-document-load').DocumentLoadInstrumentationConfig;
    "@opentelemetry/instrumentation-fetch": import('@opentelemetry/instrumentation-fetch').FetchInstrumentationConfig;
    "@opentelemetry/instrumentation-long-task": import('@opentelemetry/instrumentation-long-task').LongtaskInstrumentationConfig;
    "@opentelemetry/instrumentation-user-interaction": import('@opentelemetry/instrumentation-user-interaction').UserInteractionInstrumentationConfig;
    "@opentelemetry/instrumentation-xml-http-request": import('@opentelemetry/instrumentation-xml-http-request').XMLHttpRequestInstrumentationConfig;
    "@opentelemetry/instrumentation-web-exception": import('@opentelemetry/instrumentation-web-exception').GlobalErrorsInstrumentationConfig;
    "@opentelemetry/instrumentation-web-vitals": import('@opentelemetry/browser-instrumentation/experimental/web-vitals').WebVitalsInstrumentationConfig;
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
