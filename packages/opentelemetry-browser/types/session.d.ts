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
 */
export const SESSION_STORAGE_KEY: "elastic_otel_browser.session";
export const TAB_STORAGE_KEY: "elastic_otel_browser.tab";
export class SessionManager {
    /** @param {SessionManagerOptions} opts */
    constructor(opts: SessionManagerOptions);
    _store: Storage;
    _inactivityMs: number;
    _maxDurationMs: number;
    _onSessionStart: ((session: SessionState) => void) | undefined;
    _now: () => number;
    /** @type {SessionState | undefined} */
    _cached: SessionState | undefined;
    _persistent: boolean;
    _tabId: string;
    /**
     * Implements upstream `SessionProvider` so it can be plugged into
     * `@opentelemetry/browser-sdk/session` processors.
     * @returns {string}
     */
    getSessionId(): string;
    /**
     * Returns the active session, rotating it if expired. Every call counts
     * as activity since it happens when telemetry is produced.
     * @returns {SessionState}
     */
    getSession(): SessionState;
    /** @returns {import('@opentelemetry/api').Attributes} */
    getAttributes(): import("@opentelemetry/api").Attributes;
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
};
export type SpanProcessor = import("@opentelemetry/sdk-trace").SpanProcessor;
