/**
 * Returns `undefined` when sessions cannot outlive a page reload so EDOT
 * doesn't report IDs that would split a single user session.
 * @param {SessionConfig | null} [config]
 * @returns {SessionManager | undefined}
 */
export function createSessionManager(config?: SessionConfig | null): SessionManager | undefined;
/** @typedef {import('./config.js').SessionConfig} SessionConfig */
/** @typedef {import('./observers.js').SessionObserver} SessionObserver */
/** @typedef {import('./state.js').SessionState} SessionState */
/**
 * @typedef {Object} SessionManagerOptions
 * @property {Storage} sessionStorage storage shared by all tabs of the same origin
 * @property {Storage} tabStorage storage scoped to the current tab
 * @property {SessionSampler} [sampler] defaults to sampling every session
 * @property {number} [inactivityTimeout] seconds
 * @property {number} [maxDuration] seconds
 * @property {() => number} [now]
 * @property {import('./lifecycle.js').Timers} [timers]
 */
export class SessionManager {
    /** @param {SessionManagerOptions} opts */
    constructor(opts: SessionManagerOptions);
    _store: SessionStore;
    /** @type {import('./lifecycle.js').SessionLimits} */
    _limits: import("./lifecycle.js").SessionLimits;
    _sampler: SessionSampler;
    _now: () => number;
    _expiry: ExpiryTimer;
    _observers: SessionObservers;
    /** @type {SessionState | undefined} */
    _announced: SessionState | undefined;
    /** @type {string | undefined} */
    _createdId: string | undefined;
    _lastActivityCheck: number;
    _stopped: boolean;
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
     * Every tab sharing a session is told when it starts, this tells apart
     * the one that created it, e.g. to report the start only once.
     * @param {string} sessionId
     * @returns {boolean}
     */
    isCreatedHere(sessionId: string): boolean;
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
     * Updates the session this tab is on before telling observers, so reads
     * made from a callback (telemetry) can't announce the same change a
     * second time.
     * @param {SessionState | undefined} session
     * @returns {boolean} whether the active session changed
     */
    _sync(session: SessionState | undefined): boolean;
    /**
     * Storage is re-checked when the timer fires since another tab may have
     * extended the session.
     * @param {SessionState} session
     */
    _scheduleExpiryCheck(session: SessionState): void;
}
export type SessionConfig = import("./config.js").SessionConfig;
export type SessionObserver = import("./observers.js").SessionObserver;
export type SessionState = import("./state.js").SessionState;
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
    now?: (() => number) | undefined;
    timers?: import("./lifecycle.js").Timers | undefined;
};
import { SessionStore } from './storage.js';
import { SessionSampler } from './sampler.js';
import { ExpiryTimer } from './lifecycle.js';
import { SessionObservers } from './observers.js';
