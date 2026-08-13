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
export function startBrowserSdk(cfg?: BrowserSdkConfiguration): {
    forceFlush: () => Promise<void>;
    shutdown: () => Promise<void>;
    pauseReplay: () => void;
    resumeReplay: () => void;
    pause: () => void;
    resume: () => void;
    sessionId: string | null;
    setUser: typeof setUser;
    clearUser: typeof clearUser;
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
    "console": import('@opentelemetry/browser-instrumentation/experimental/console').ConsoleInstrumentationConfig;
    "userAction": import('@opentelemetry/browser-instrumentation/experimental/user-action').UserActionInstrumentationConfig;
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
     * // session lifecycle
     */
    instrumentations?: Partial<InstrumentationsConfigMap>;
    /**
     * // experimental session replay (POC)
     */
    session?: SessionConfiguration;
    replay?: ReplayConfiguration;
    capture?: CaptureConfiguration;
};
export type CaptureConfiguration = {
    ignoreUrls?: Array<string | RegExp>;
    urlGrouping?: {
        depth?: number;
        rules?: string[];
    };
    beforeSend?: (signal: {
        kind: 'span' | 'log';
        attributes: Record<string, unknown>;
    }) => boolean | void;
    graphql?: boolean;
};
export type SessionConfiguration = {
    maxMs?: number;
    idleMs?: number;
    persistSession?: boolean;
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
    maxChunkBytes?: number;
    sampling?: {
        mousemove?: number;
        scroll?: number;
        input?: string;
        canvas?: number;
    };
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
    sampling?: {
        mousemove?: number;
        scroll?: number;
        input?: string;
        canvas?: number;
    };
    flushIntervalMs?: number;
    maxChunkBytes?: number;
};
import { pauseReplay } from './replay.js';
import { resumeReplay } from './replay.js';
import { setUser } from './user.js';
import { clearUser } from './user.js';
