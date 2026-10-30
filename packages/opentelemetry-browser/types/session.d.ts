/**
 * Returns `undefined` when sessions cannot outlive a page reload so EDOT
 * doesn't report IDs that would split a single user session.
 * @param {SessionConfig | null} [config]
 * @param {(session: SessionState) => void} [onSessionStart]
 * @returns {SessionManager | undefined}
 */
export function createSessionManager(config?: SessionConfig | null, onSessionStart?: (session: SessionState) => void): SessionManager | undefined;
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
 * Invalid values fall back to defaults so a typo never leaves sessions
 * without any activity signal.
 * @param {SessionConfig | null | undefined} config
 * @returns {string[]}
 */
export function resolveActivityEvents(config: SessionConfig | null | undefined): string[];
/**
 * Listens in the capture phase so handlers calling `stopPropagation()`
 * can't hide activity. Untrusted events are ignored so scripts dispatching
 * synthetic events can't keep a session alive.
 * @param {{recordActivity: (opts?: {renew?: boolean}) => void}} manager
 * @param {readonly string[]} events
 * @param {(event: Event) => boolean} [isTrusted]
 * @returns {() => void} stop tracking
 */
export function trackUserActivity(manager: {
    recordActivity: (opts?: {
        renew?: boolean;
    }) => void;
}, events: readonly string[], isTrusted?: (event: Event) => boolean): () => void;
/**
 * Public session API. A no-op when sessions are unavailable so callers
 * don't need to check.
 * @param {SessionManager | undefined} manager
 * @returns {SessionApi}
 */
export function createSessionApi(manager: SessionManager | undefined): SessionApi;
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
 * @property {string[]} [activityEvents] // DOM events that count as user activity
 * @property {number} [sampleRate] // within [0..1] range, default 1
 */
/**
 * Public view of a session.
 * @typedef {Object} SessionInfo
 * @property {string} id
 * @property {string} [previousId]
 * @property {number} startTimestamp
 */
/**
 * Same shape as the upstream `SessionObserver`, with optional callbacks.
 * @typedef {Object} SessionObserver
 * @property {(session: SessionInfo, previous?: SessionInfo) => void} [onSessionStarted]
 * @property {(session: SessionInfo) => void} [onSessionEnded]
 */
/**
 * @typedef {Object} SessionApi
 * @property {() => SessionInfo | undefined} getSession
 * @property {(observer: SessionObserver) => () => void} addObserver
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
 * @property {SessionSampler} [sampler] defaults to sampling every session
 * @property {number} [inactivityTimeout] seconds
 * @property {number} [maxDuration] seconds
 * @property {(session: SessionState) => void} [onSessionStart]
 * @property {() => number} [now]
 * @property {{setTimeout: (fn: () => void, ms: number) => unknown, clearTimeout: (timer: any) => void}} [timers]
 */
export const SESSION_STORAGE_KEY: "elastic_otel_browser.session";
export const TAB_STORAGE_KEY: "elastic_otel_browser.tab";
/** @type {readonly string[]} */
export const DEFAULT_ACTIVITY_EVENTS: readonly string[];
export class SessionManager {
    /** @param {SessionManagerOptions} opts */
    constructor(opts: SessionManagerOptions);
    _store: Storage;
    _inactivityMs: number;
    _maxDurationMs: number;
    _onSessionStart: ((session: SessionState) => void) | undefined;
    _sampler: SessionSampler;
    _now: () => number;
    _timers: {
        setTimeout: (fn: () => void, ms: number) => unknown;
        clearTimeout: (timer: any) => void;
    };
    /** @type {unknown} */
    _timer: unknown;
    /** @type {SessionState | undefined} */
    _cached: SessionState | undefined;
    _persistent: boolean;
    /** @type {SessionState | undefined} */
    _active: SessionState | undefined;
    /** @type {SessionState | undefined} */
    _lastEnded: SessionState | undefined;
    _lastActivityCheck: number;
    _expiresAt: number;
    _stopped: boolean;
    /** @type {Set<{observer: SessionObserver}>} */
    _observers: Set<{
        observer: SessionObserver;
    }>;
    /** @type {Array<{type: 'ended' | 'started', session: SessionState, created?: boolean}>} */
    _events: Array<{
        type: "ended" | "started";
        session: SessionState;
        created?: boolean;
    }>;
    _flushing: boolean;
    _tabId: string;
    /**
     * Continues the stored session or starts a new one. Loading the page
     * counts as activity.
     */
    start(): void;
    /**
     * Implements upstream `SessionProvider` so it can be plugged into
     * `@opentelemetry/browser-sdk/session` processors.
     * @returns {string | null}
     */
    getSessionId(): string | null;
    /**
     * Returns the active session, or `undefined` once it expired and the
     * user has not come back. Reading never extends nor renews the session:
     * telemetry can be produced without a user around (polling, replay), so
     * only {@link recordActivity} does.
     * @returns {SessionState | undefined}
     */
    getSession(): SessionState | undefined;
    /**
     * Marks user activity, extending the session or renewing an expired one.
     * With `renew: false` an expired session stays ended, which is what
     * passive signals like a tab becoming visible need.
     * @param {{renew?: boolean}} [opts]
     */
    recordActivity({ renew }?: {
        renew?: boolean;
    }): void;
    /**
     * Callbacks run synchronously, in registration order. `onSessionEnded`
     * is reported by an expiry timer, or on the next read if the timer was
     * throttled (background tabs) or the session was replaced by another tab.
     * @param {SessionObserver} observer
     * @returns {() => void} unsubscribe
     */
    addObserver(observer: SessionObserver): () => void;
    /** Stops tracking for good: no timers, reads or notifications. */
    shutdown(): void;
    getTabId(): string;
    /**
     * Without an active session (expired, waiting for the next user
     * interaction) there is no sampling decision. Everything is exported
     * only when every session would be sampled anyway.
     * @returns {boolean}
     */
    exportsWithoutSession(): boolean;
    /** @returns {import('@opentelemetry/api').Attributes} */
    getAttributes(): import("@opentelemetry/api").Attributes;
    /**
     * @param {number} now
     * @param {{extend: boolean, renew: boolean}} mode
     * @returns {SessionState | undefined}
     */
    _resolve(now: number, { extend, renew }: {
        extend: boolean;
        renew: boolean;
    }): SessionState | undefined;
    /**
     * Updates the session this tab is on and queues what observers must be
     * told. State changes first and events are delivered in order by a single
     * loop, so reads made from a callback (telemetry) can't announce the same
     * change a second time.
     * @param {SessionState | undefined} session
     * @param {boolean} created whether this tab just created it
     * @returns {boolean} whether the active session changed
     */
    _sync(session: SessionState | undefined, created: boolean): boolean;
    _flush(): void;
    /** @param {(observer: SessionObserver) => void} call */
    _notify(call: (observer: SessionObserver) => void): void;
    /**
     * Timers are throttled in background tabs, so reads also detect expiry.
     * Storage is re-checked when it fires since another tab may have
     * extended the session.
     * @param {SessionState} session
     */
    _arm(session: SessionState): void;
    _clearTimer(): void;
    /**
     * @param {SessionState} session
     * @param {number} now
     */
    _isExpired(session: SessionState, now: number): boolean;
    /** @returns {SessionState | undefined} */
    _read(): SessionState | undefined;
    /** @param {SessionState} session */
    _write(session: SessionState): void;
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
 * Adds session attributes on span start and lets only the spans of sampled
 * sessions reach the wrapped processors.
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
    /** @param {import('@opentelemetry/sdk-trace').Span} span */
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
 * Adds session attributes on log emit and lets only the records of sampled
 * sessions reach the wrapped processors. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 */
export class SessionLogRecordProcessor {
    /** @param {SessionLogRecordProcessorOptions} options */
    constructor(options: SessionLogRecordProcessorOptions);
    _manager: SessionManager;
    _processors: import("@opentelemetry/sdk-logs").LogRecordProcessor[];
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
    activityEvents?: string[] | undefined;
    sampleRate?: number | undefined;
};
/**
 * Public view of a session.
 */
export type SessionInfo = {
    id: string;
    previousId?: string | undefined;
    startTimestamp: number;
};
/**
 * Same shape as the upstream `SessionObserver`, with optional callbacks.
 */
export type SessionObserver = {
    onSessionStarted?: ((session: SessionInfo, previous?: SessionInfo) => void) | undefined;
    onSessionEnded?: ((session: SessionInfo) => void) | undefined;
};
export type SessionApi = {
    getSession: () => SessionInfo | undefined;
    addObserver: (observer: SessionObserver) => () => void;
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
    /**
     * defaults to sampling every session
     */
    sampler?: SessionSampler | undefined;
    /**
     * seconds
     */
    inactivityTimeout?: number | undefined;
    /**
     * seconds
     */
    maxDuration?: number | undefined;
    onSessionStart?: ((session: SessionState) => void) | undefined;
    now?: (() => number) | undefined;
    timers?: {
        setTimeout: (fn: () => void, ms: number) => unknown;
        clearTimeout: (timer: any) => void;
    } | undefined;
};
export type SamplingResult = {
    decision: SamplingDecision;
};
export type LogRecordProcessor = import("@opentelemetry/sdk-logs").LogRecordProcessor;
export type SessionLogRecordProcessorOptions = {
    manager: SessionManager;
    processors: LogRecordProcessor[];
};
