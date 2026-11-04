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
    "navigation-timing": import("@opentelemetry/browser-instrumentation/experimental/navigation-timing").NavigationTimingInstrumentationConfig;
    "resource-timing": import("@opentelemetry/browser-instrumentation/experimental/resource-timing").ResourceTimingInstrumentationConfig;
    "fetch": import("@opentelemetry/browser-instrumentation/experimental/fetch").FetchInstrumentationConfig;
    "user-action": import("@opentelemetry/browser-instrumentation/experimental/user-action").UserActionInstrumentationConfig;
    "xhr": import("@opentelemetry/browser-instrumentation/experimental/xhr").XhrInstrumentationConfig;
    "errors": import("@opentelemetry/browser-instrumentation/experimental/errors").ErrorsInstrumentationConfig;
    "web-vitals": import("@opentelemetry/browser-instrumentation/experimental/web-vitals").WebVitalsInstrumentationConfig;
};
/**
 * Configuration that is defined in upstream SDK
 */
export type SdkConfig = {
    disabled?: boolean | undefined;
    logLevel?: "warn" | "error" | "none" | "info" | "debug" | "verbose" | "all" | undefined;
    serviceName?: string | undefined;
    serviceVersion?: string | undefined;
    resourceAttributes?: import("@opentelemetry/api").Attributes | undefined;
    exportConfig?: {
        url?: string;
        tracesUrl?: string;
        logsUrl?: string;
        metricsUrl?: string;
        headers?: Record<string, string>;
    } | undefined;
};
/**
 * Configuration properties that are only in EDOT
 */
export type EdotConfig = {
    instrumentations?: Partial<InstrumentationsConfigMap> | undefined;
    session?: import("./session/config.js").SessionConfig | undefined;
    ignoreFetchUrls?: (string | RegExp)[] | undefined;
    disableInstrumentations?: (keyof InstrumentationsConfigMap)[] | undefined;
};
export type BrowserSdkConfiguration = SdkConfig & EdotConfig;
export type BrowserSdk = {
    shutdown: () => Promise<void>;
    getSession: import("./session.js").SessionApi["getSession"];
    addObserver: import("./session.js").SessionApi["addObserver"];
    endSession: import("./session.js").SessionApi["endSession"];
    /**
     * Sets the
     * low-cardinality route of the current page (e.g. `/product/{id}`), added as
     * `url.template` to spans and log records. The route applies until the page
     * path changes, so call it after your router updates the URL. Passing
     * `undefined` falls back to the `pageRoute` configuration.
     */
    setPageRoute: (route: string | undefined) => void;
};
export type DefaultConfigProps = "logLevel" | "serviceName" | "resourceAttributes" | "exportConfig";
