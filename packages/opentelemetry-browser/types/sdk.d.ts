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
    "navigation": import("@opentelemetry/browser-instrumentation/experimental/navigation").NavigationInstrumentationConfig;
    "@opentelemetry/instrumentation-document-load": import("@opentelemetry/instrumentation-document-load").DocumentLoadInstrumentationConfig;
    "fetch": import("@opentelemetry/browser-instrumentation/experimental/fetch").FetchInstrumentationConfig;
    "@opentelemetry/instrumentation-long-task": import("@opentelemetry/instrumentation-long-task").LongtaskInstrumentationConfig;
    "@opentelemetry/instrumentation-user-interaction": import("@opentelemetry/instrumentation-user-interaction").UserInteractionInstrumentationConfig;
    "xhr": import("@opentelemetry/browser-instrumentation/experimental/xhr").XhrInstrumentationConfig;
    "errors": import("@opentelemetry/browser-instrumentation/experimental/errors").ErrorsInstrumentationConfig;
    "web-vitals": import("@opentelemetry/browser-instrumentation/experimental/web-vitals").WebVitalsInstrumentationConfig;
};
/**
 * Configuration that is defined in upstream SDK
 */
export type SdkConfig = import("@opentelemetry/browser-sdk").RootConfig;
/**
 * Configuration properties that are only in EDOT
 */
export type EdotConfig = {
    sampleRate?: number | undefined;
    instrumentations?: Partial<InstrumentationsConfigMap> | undefined;
};
export type BrowserSdkConfiguration = SdkConfig & EdotConfig;
export type DefaultConfigProps = "logLevel" | "serviceName" | "resourceAttributes" | "sampleRate" | "exportConfig";
