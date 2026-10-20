/**
 * Returns `undefined` when sessions cannot outlive a page reload so EDOT
 * doesn't report IDs that would split a single user session.
 * @param {SessionConfig} [config]
 * @param {(session: SessionState) => void} [onSessionStart]
 * @returns {SessionManager | undefined}
 */
export function createSessionManager(config?: SessionConfig, onSessionStart?: (session: SessionState) => void): SessionManager | undefined;
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
 * @param {SessionConfig} config
 * @returns {string[]}
 */
export function resolveActivityEvents(config: SessionConfig): string[];
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
 * @property {boolean} [enabled] // defaults to true
 * @property {number} [inactivityTimeout] // seconds, defaults to 30 minutes
 * @property {number} [maxDuration] // seconds, defaults to 4 hours
 * @property {string[]} [activityEvents] // DOM events that count as user activity
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
 */
/**
 * @typedef {Object} SessionManagerOptions
 * @property {Storage} sessionStorage storage shared by all tabs of the same origin
 * @property {Storage} tabStorage storage scoped to the current tab
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
    /** @type {Set<SessionObserver>} */
    _observers: Set<SessionObserver>;
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
    shutdown(): void;
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
     * Announces to observers when the session this tab is on changes.
     * @param {SessionState | undefined} session
     * @param {boolean} created whether this tab just created it
     * @returns {boolean} whether the active session changed
     */
    _sync(session: SessionState | undefined, created: boolean): boolean;
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
/** @typedef {import('@opentelemetry/sdk-trace').SpanProcessor} SpanProcessor */
/**
 * Adds session attributes on span start.
 * @implements {SpanProcessor}
 */
export class SessionSpanProcessor implements SpanProcessor {
    /** @param {SessionManager} manager */
    constructor(manager: SessionManager);
    _manager: SessionManager;
    /** @param {import('@opentelemetry/sdk-trace').Span} span */
    onStart(span: import("@opentelemetry/sdk-trace").Span): void;
    onEnd(): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
/**
 * Adds session attributes on log emit. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 */
export class SessionLogRecordProcessor {
    /** @param {SessionManager} manager */
    constructor(manager: SessionManager);
    _manager: SessionManager;
    /** @param {{setAttributes: (attrs: import('@opentelemetry/api').Attributes) => unknown}} logRecord */
    onEmit(logRecord: {
        setAttributes: (attrs: import("@opentelemetry/api").Attributes) => unknown;
    }): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
export type SessionConfig = {
    enabled?: boolean | undefined;
    inactivityTimeout?: number | undefined;
    maxDuration?: number | undefined;
    activityEvents?: string[] | undefined;
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
export type SpanProcessor = import("@opentelemetry/sdk-trace").SpanProcessor;
