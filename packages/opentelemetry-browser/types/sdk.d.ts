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
export function startBrowserSdk(cfg?: BrowserSdkConfiguration): {
    forceFlush: () => Promise<void>;
    shutdown: () => Promise<void>;
    pauseReplay: () => void;
    resumeReplay: () => void;
    sessionId: string | null;
};
export type InstrumentationsConfigMap = {
    "@opentelemetry/instrumentation-browser-navigation": import('@opentelemetry/instrumentation-browser-navigation').BrowserNavigationInstrumentationConfig;
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
    /**
     * // experimental session replay (POC)
     */
    instrumentations?: Partial<InstrumentationsConfigMap>;
    replay?: ReplayConfiguration;
};
export type ReplayPrivacyConfiguration = {
    maskAllInputs?: boolean;
    maskAllText?: boolean;
    maskTextSelector?: string;
    blockSelector?: string;
    blockClass?: string;
    ignoreClass?: string;
    maskInputOptions?: Record<string, boolean>;
    maskInputFn?: (text: string, element: HTMLElement) => string;
};
export type ReplayQualityConfiguration = {
    inlineStylesheet?: boolean;
    collectFonts?: boolean;
    slimDOM?: boolean;
    recordCanvas?: boolean;
    packEvents?: boolean;
};
/**
 * Experimental session replay options (POC). Off by default.
 */
export type ReplayConfiguration = {
    enabled?: boolean;
    samplingRate?: number;
    errorSamplingRate?: number;
    privacy?: ReplayPrivacyConfiguration;
    quality?: ReplayQualityConfiguration;
};
import { pauseReplay } from './replay.js';
import { resumeReplay } from './replay.js';
