/**
 * Returns `undefined` when sessions cannot outlive a page reload so EDOT
 * doesn't report IDs that would split a single user session.
 * @param {SessionConfig} [config]
 * @returns {SessionManager | undefined}
 */
export function createSessionManager(config?: SessionConfig): SessionManager | undefined;
/**
 * Invalid values fall back to defaults and out-of-range values are clamped,
 * so a bad config never disables sessions nor rotates them on every event.
 * @param {SessionConfig} config
 * @returns {{inactivityTimeout: number, maxDuration: number}} seconds
 */
export function resolveSessionTimeouts(config: SessionConfig): {
    inactivityTimeout: number;
    maxDuration: number;
};
/**
 * UUID v4 as required by semantic conventions. IDs feed sampling decisions so
 * a CSPRNG is preferred; `randomUUID` needs a secure context while
 * `getRandomValues` does not.
 * @returns {string}
 */
export function generateUUID(): string;
/**
 * @typedef {Object} SessionConfig
 * @property {number} [inactivityTimeout] // seconds, defaults to 30 minutes
 * @property {number} [maxDuration] // seconds, defaults to 4 hours
 * @property {number} [sampleRate] // within [0..1] range, default 1
 */
/**
 * @typedef {Object} SessionState
 * @property {string} id
 * @property {string} [previousId]
 * @property {number} startTimestamp
 * @property {number} lastActivityTimestamp
 * @property {boolean} sampled
 * @property {number} samplingRate
 */
/**
 * @typedef {Object} SessionManagerOptions
 * @property {Storage} sessionStorage storage shared by all tabs of the same origin
 * @property {Storage} tabStorage storage scoped to the current tab
 * @property {SessionSampler} sampler
 * @property {number} [inactivityTimeout] seconds
 * @property {number} [maxDuration] seconds
 * @property {() => number} [now]
 */
/**
 * @typedef {'session:start' | 'session:end'} SessionEvent
 */
export const SESSION_STORAGE_KEY: "elastic_otel_browser.session";
export const TAB_STORAGE_KEY: "elastic_otel_browser.tab";
export class SessionManager {
    /** @param {SessionManagerOptions} opts */
    constructor(opts: SessionManagerOptions);
    _store: Storage;
    _inactivityMs: number;
    _maxDurationMs: number;
    _now: () => number;
    /** @type {SessionState | undefined} */
    _cached: SessionState | undefined;
    _persistent: boolean;
    _tabId: string;
    _sampler: SessionSampler;
    /** @type {Map<SessionEvent, Array<(session: SessionState) => void>>} */
    _observers: Map<SessionEvent, Array<(session: SessionState) => void>>;
    /**
     * Implements upstream `SessionProvider` so it can be plugged into
     * `@opentelemetry/browser-sdk/session` processors.
     * @returns {string}
     */
    getSessionId(): string;
    getTabId(): string;
    /**
     * Returns the active session, rotating it if expired. Every call counts
     * as activity since it happens when telemetry is produced.
     * @returns {SessionState}
     */
    getSession(): SessionState;
    /**
     * @param {SessionEvent} event
     * @param {(session: SessionState) => void} handler
     * @returns {(() => void) | undefined}
     */
    observe(event: SessionEvent, handler: (session: SessionState) => void): (() => void) | undefined;
    /**
     * @param {SessionState} session
     * @param {number} now
     */
    _isExpired(session: SessionState, now: number): boolean;
    /** @returns {SessionState | undefined} */
    _read(): SessionState | undefined;
    /** @param {SessionState} session */
    _write(session: SessionState): void;
    /**
     * Runs all observers for a given event is a safe way
     * @param {SessionEvent} event
     * @param {any} payload
     */
    _notify(event: SessionEvent, payload: any): void;
}
export type SamplingDecision = number;
export namespace SamplingDecision {
    let NOT_RECORD: number;
    let RECORD: number;
}
/**
 * @typedef {Object} SamplingResult
 * @property {SamplingDecision} decision
 */
/**
 *
 */
export class SessionSampler {
    /** @param {number} ratio */
    constructor(ratio: number);
    _ratio: number;
    get ratio(): number;
    /**
     * @param {string} sessionId
     * @returns {SamplingResult}
     */
    shouldSample(sessionId: string): SamplingResult;
    toString(): string;
}
/**
 * Adds session attributes on span start.
 * @implements {SpanProcessor}
 */
export class SessionSpanProcessor implements SpanProcessor {
    /** @param {SessionSpanProcessorOptions} options */
    constructor(options: SessionSpanProcessorOptions);
    _manager: SessionManager;
    _processors: import("@opentelemetry/sdk-trace").SpanProcessor[];
    _sampledSpans: WeakSet<object>;
    /**
     * @param {import('@opentelemetry/sdk-trace').Span} span
     * @param {import('@opentelemetry/api').Context} ctx
     */
    onStart(span: import("@opentelemetry/sdk-trace").Span, ctx: import("@opentelemetry/api").Context): void;
    /**
     * @param {import('@opentelemetry/sdk-trace').Span} span
     */
    onEnd(span: import("@opentelemetry/sdk-trace").Span): void;
    forceFlush(): Promise<undefined>;
    shutdown(): Promise<undefined>;
}
/** @typedef {import('@opentelemetry/sdk-logs').LogRecordProcessor} LogRecordProcessor */
/**
 * @typedef {Object} SessionLogRecordProcessorOptions
 * @property {SessionManager} manager
 * @property {LogRecordProcessor[]} processors
 */
/**
 * Adds session attributes on log emit. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 */
export class SessionLogRecordProcessor {
    /** @param {SessionLogRecordProcessorOptions} options */
    constructor(options: SessionLogRecordProcessorOptions);
    _manager: SessionManager;
    _processors: import("@opentelemetry/sdk-logs").LogRecordProcessor[];
    /** @param {{setAttributes: (attrs: import('@opentelemetry/api').Attributes) => unknown}} logRecord */
    /**
     * @param {import('@opentelemetry/sdk-logs').SdkLogRecord} logRecord
     * @param {import('@opentelemetry/api').Context} [ctx]
     */
    onEmit(logRecord: import("@opentelemetry/sdk-logs").SdkLogRecord, ctx?: import("@opentelemetry/api").Context): void;
    forceFlush(): Promise<undefined>;
    shutdown(): Promise<undefined>;
}
export type SpanProcessor = import("@opentelemetry/sdk-trace").SpanProcessor;
export type SessionSpanProcessorOptions = {
    manager: SessionManager;
    processors: SpanProcessor[];
};
export type SessionConfig = {
    inactivityTimeout?: number | undefined;
    maxDuration?: number | undefined;
    sampleRate?: number | undefined;
};
export type SessionState = {
    id: string;
    previousId?: string | undefined;
    startTimestamp: number;
    lastActivityTimestamp: number;
    sampled: boolean;
    samplingRate: number;
};
export type SessionManagerOptions = {
    /**
     * storage shared by all tabs of the same origin
     */
    sessionStorage: Storage;
    /**
     * storage scoped to the current tab
     */
    tabStorage: Storage;
    sampler: SessionSampler;
    /**
     * seconds
     */
    inactivityTimeout?: number | undefined;
    /**
     * seconds
     */
    maxDuration?: number | undefined;
    now?: (() => number) | undefined;
};
export type SessionEvent = "session:start" | "session:end";
export type SamplingResult = {
    decision: SamplingDecision;
};
export type LogRecordProcessor = import("@opentelemetry/sdk-logs").LogRecordProcessor;
export type SessionLogRecordProcessorOptions = {
    manager: SessionManager;
    processors: LogRecordProcessor[];
};
