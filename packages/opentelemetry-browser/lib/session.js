/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

import {
    ATTR_BROWSER_TAB_ID,
    ATTR_SESSION_ID,
    ATTR_SESSION_PREVIOUS_ID,
    ATTR_SESSION_SAMPLING_RATE,
} from './semconv.js';

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

export const SESSION_STORAGE_KEY = 'elastic_otel_browser.session';
export const TAB_STORAGE_KEY = 'elastic_otel_browser.tab';

/** @type {readonly string[]} */
export const DEFAULT_ACTIVITY_EVENTS = Object.freeze([
    'pointerdown',
    'keydown',
    'scroll',
    'wheel',
]);

const DEFAULT_INACTIVITY_TIMEOUT_S = 30 * 60;
const DEFAULT_MAX_DURATION_S = 4 * 60 * 60;
const MIN_INACTIVITY_TIMEOUT_S = 5 * 60;
const MIN_MAX_DURATION_S = 30 * 60;
const MAX_MAX_DURATION_S = 24 * 60 * 60;
// Bounds localStorage writes when telemetry is emitted in bursts
const ACTIVITY_WRITE_THROTTLE_MS = 5_000;
// RUM session spec: no session ID is kept around for more than 24 hours
const PREVIOUS_ID_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// A stored session further ahead than this means the clock was moved back
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
// Longer delays overflow in browsers and fire immediately
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;

export class SessionManager {
    /** @param {SessionManagerOptions} opts */
    constructor(opts) {
        this._store = opts.sessionStorage;
        this._inactivityMs =
            (opts.inactivityTimeout ?? DEFAULT_INACTIVITY_TIMEOUT_S) * 1000;
        this._maxDurationMs =
            (opts.maxDuration ?? DEFAULT_MAX_DURATION_S) * 1000;
        this._onSessionStart = opts.onSessionStart;
        this._sampler = opts.sampler ?? new SessionSampler(1);
        this._now = opts.now ?? Date.now;
        // Resolved on each call so patched timers (e.g. fake clocks) apply
        this._timers = opts.timers ?? {
            setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
            clearTimeout: (timer) => globalThis.clearTimeout(timer),
        };
        /** @type {unknown} */
        this._timer = undefined;
        /** @type {SessionState | undefined} */
        this._cached = undefined;
        this._persistent = true;
        // Session this tab last announced to observers
        /** @type {SessionState | undefined} */
        this._active = undefined;
        /** @type {SessionState | undefined} */
        this._lastEnded = undefined;
        this._lastActivityCheck = 0;
        this._expiresAt = 0;
        this._stopped = false;
        /** @type {Set<{observer: SessionObserver}>} */
        this._observers = new Set();
        /** @type {Array<{type: 'ended' | 'started', session: SessionState, created?: boolean}>} */
        this._events = [];
        this._flushing = false;
        this._tabId = getOrCreateTabId(opts.tabStorage);
    }

    /**
     * Continues the stored session or starts a new one. Loading the page
     * counts as activity.
     */
    start() {
        this._resolve(this._now(), {extend: true, renew: true});
    }

    /**
     * Implements upstream `SessionProvider` so it can be plugged into
     * `@opentelemetry/browser-sdk/session` processors.
     * @returns {string | null}
     */
    getSessionId() {
        return this.getSession()?.id ?? null;
    }

    /**
     * Returns the active session, or `undefined` once it expired and the
     * user has not come back. Reading never extends nor renews the session:
     * telemetry can be produced without a user around (polling, replay), so
     * only {@link recordActivity} does.
     * @returns {SessionState | undefined}
     */
    getSession() {
        return this._resolve(this._now(), {extend: false, renew: false});
    }

    /**
     * Marks user activity, extending the session or renewing an expired one.
     * With `renew: false` an expired session stays ended, which is what
     * passive signals like a tab becoming visible need.
     * @param {{renew?: boolean}} [opts]
     */
    recordActivity({renew = true} = {}) {
        const now = this._now();
        if (renew) {
            // Never skip once the known session expired: this activity has to
            // renew it, or the telemetry it triggers would have no session.
            if (
                now - this._lastActivityCheck < ACTIVITY_WRITE_THROTTLE_MS &&
                now < this._expiresAt
            ) {
                return;
            }
            this._lastActivityCheck = now;
        }
        this._resolve(now, {extend: true, renew});
    }

    /**
     * Callbacks run synchronously, in registration order. `onSessionEnded`
     * is reported by an expiry timer, or on the next read if the timer was
     * throttled (background tabs) or the session was replaced by another tab.
     * @param {SessionObserver} observer
     * @returns {() => void} unsubscribe
     */
    addObserver(observer) {
        if (this._stopped) {
            return () => {};
        }
        // Wrapped so adding the same object twice can be unsubscribed
        // separately, while its methods keep their `this`.
        const entry = {observer};
        this._observers.add(entry);
        return () => {
            this._observers.delete(entry);
        };
    }

    /** Stops tracking for good: no timers, reads or notifications. */
    shutdown() {
        this._stopped = true;
        this._clearTimer();
        this._observers.clear();
        this._active = undefined;
    }

    getTabId() {
        return this._tabId;
    }

    /**
     * Without an active session (expired, waiting for the next user
     * interaction) there is no sampling decision. Everything is exported
     * only when every session would be sampled anyway.
     * @returns {boolean}
     */
    exportsWithoutSession() {
        return this._sampler.ratio === 1;
    }

    /** @returns {import('@opentelemetry/api').Attributes} */
    getAttributes() {
        return sessionToAttributes(this.getSession(), this._tabId);
    }

    /**
     * @param {number} now
     * @param {{extend: boolean, renew: boolean}} mode
     * @returns {SessionState | undefined}
     */
    _resolve(now, {extend, renew}) {
        if (this._stopped) {
            return undefined;
        }
        const stored = this._read();
        /** @type {SessionState | undefined} */
        let session;
        let created = false;
        let extended = false;

        if (stored && !this._isExpired(stored, now)) {
            session = stored;
            if (
                extend &&
                now - stored.lastActivityTimestamp >= ACTIVITY_WRITE_THROTTLE_MS
            ) {
                stored.lastActivityTimestamp = now;
                this._write(stored);
                extended = true;
            }
        } else if (renew) {
            created = true;
            const id = generateUUID();
            session = {
                id,
                previousId:
                    stored &&
                    now - stored.startTimestamp < PREVIOUS_ID_MAX_AGE_MS
                        ? stored.id
                        : undefined,
                startTimestamp: now,
                lastActivityTimestamp: now,
                sampled:
                    this._sampler.shouldSample(id).decision ===
                    SamplingDecision.RECORD,
                samplingRate: this._sampler.ratio,
            };
            this._write(session);
            diag.debug('Session started', session);
        }

        const changed = this._sync(session, created);
        if (session && (changed || extended)) {
            this._arm(session);
        }
        return session;
    }

    /**
     * Updates the session this tab is on and queues what observers must be
     * told. State changes first and events are delivered in order by a single
     * loop, so reads made from a callback (telemetry) can't announce the same
     * change a second time.
     * @param {SessionState | undefined} session
     * @param {boolean} created whether this tab just created it
     * @returns {boolean} whether the active session changed
     */
    _sync(session, created) {
        const previous = this._active;
        if (previous?.id === session?.id) {
            return false;
        }

        this._active = session && {...session};
        if (previous) {
            this._lastEnded = previous;
            this._expiresAt = 0;
            this._clearTimer();
            this._events.push({type: 'ended', session: previous});
        }
        if (session) {
            this._events.push({type: 'started', session, created});
        }
        this._flush();
        return true;
    }

    _flush() {
        if (this._flushing) {
            return;
        }
        this._flushing = true;
        try {
            for (let event; (event = this._events.shift()); ) {
                const {session} = event;
                if (event.type === 'ended') {
                    this._notify((o) =>
                        o.onSessionEnded?.(toSessionInfo(session))
                    );
                    continue;
                }
                if (event.created) {
                    this._onSessionStart?.(session);
                }
                // Only the real previous session: this tab may have missed
                // others that ran while it was idle.
                const ended = this._lastEnded;
                const previous =
                    ended && ended.id === session.previousId
                        ? toSessionInfo(ended)
                        : undefined;
                this._notify((o) =>
                    o.onSessionStarted?.(toSessionInfo(session), previous)
                );
            }
        } finally {
            this._flushing = false;
        }
    }

    /** @param {(observer: SessionObserver) => void} call */
    _notify(call) {
        for (const {observer} of [...this._observers]) {
            try {
                call(observer);
            } catch (err) {
                diag.warn('Session observer failed', err);
            }
        }
    }

    /**
     * Timers are throttled in background tabs, so reads also detect expiry.
     * Storage is re-checked when it fires since another tab may have
     * extended the session.
     * @param {SessionState} session
     */
    _arm(session) {
        this._clearTimer();
        const expiresAt = Math.min(
            session.lastActivityTimestamp + this._inactivityMs,
            session.startTimestamp + this._maxDurationMs
        );
        this._expiresAt = expiresAt;
        this._timer = this._timers.setTimeout(
            () => {
                this._timer = undefined;
                const current = this._resolve(this._now(), {
                    extend: false,
                    renew: false,
                });
                if (current) {
                    this._arm(current);
                }
            },
            Math.min(MAX_TIMER_DELAY_MS, Math.max(0, expiresAt - this._now()))
        );
    }

    _clearTimer() {
        if (this._timer !== undefined) {
            this._timers.clearTimeout(this._timer);
            this._timer = undefined;
        }
    }

    /**
     * @param {SessionState} session
     * @param {number} now
     */
    _isExpired(session, now) {
        // Ages would be negative and the session would never end
        const ahead =
            Math.max(session.startTimestamp, session.lastActivityTimestamp) -
            now;
        return (
            ahead > MAX_CLOCK_SKEW_MS ||
            now - session.lastActivityTimestamp >= this._inactivityMs ||
            now - session.startTimestamp >= this._maxDurationMs
        );
    }

    /** @returns {SessionState | undefined} */
    _read() {
        if (!this._persistent) {
            return this._cached;
        }
        // Read storage on every call so sessions rotated by other tabs are
        // picked up without `storage` event listeners.
        try {
            const raw = this._store.getItem(SESSION_STORAGE_KEY);
            this._cached = raw ? parseSession(raw) : undefined;
        } catch (err) {
            diag.debug('Session storage read failed', err);
        }
        return this._cached;
    }

    /** @param {SessionState} session */
    _write(session) {
        this._cached = session;
        if (!this._persistent) {
            return;
        }
        try {
            this._store.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        } catch (err) {
            // e.g. quota exceeded. Without this the stale stored value would
            // force a rotation on every read.
            this._persistent = false;
            diag.warn(
                'Session storage write failed, keeping it in memory',
                err
            );
        }
    }
}

/**
 * Returns `undefined` when sessions cannot outlive a page reload so EDOT
 * doesn't report IDs that would split a single user session.
 * @param {SessionConfig | null} [config]
 * @param {(session: SessionState) => void} [onSessionStart]
 * @returns {SessionManager | undefined}
 */
export function createSessionManager(config, onSessionStart) {
    config = normalizeSessionConfig(config);
    const sessionStorage = getStorage('localStorage');
    const tabStorage = getStorage('sessionStorage');
    if (!sessionStorage || !tabStorage) {
        diag.warn(
            'Web storage is not available. Session attributes will not be added.'
        );
        return undefined;
    }
    return new SessionManager({
        sessionStorage,
        tabStorage,
        sampler: new SessionSampler(config.sampleRate ?? 1),
        ...resolveSessionTimeouts(config),
        onSessionStart,
    });
}

/**
 * Invalid values fall back to defaults and out-of-range values are clamped,
 * so a bad config never disables sessions nor rotates them on every event.
 * @param {SessionConfig} config
 * @returns {{inactivityTimeout: number, maxDuration: number}} seconds
 */
export function resolveSessionTimeouts(config) {
    const maxDuration = resolveSeconds(
        'maxDuration',
        config.maxDuration,
        DEFAULT_MAX_DURATION_S,
        MIN_MAX_DURATION_S,
        MAX_MAX_DURATION_S
    );
    const inactivityTimeout = resolveSeconds(
        'inactivityTimeout',
        config.inactivityTimeout,
        DEFAULT_INACTIVITY_TIMEOUT_S,
        MIN_INACTIVITY_TIMEOUT_S,
        maxDuration
    );
    return {inactivityTimeout, maxDuration};
}

/**
 * Invalid values fall back to defaults so a typo never leaves sessions
 * without any activity signal.
 * @param {SessionConfig | null | undefined} config
 * @returns {string[]}
 */
export function resolveActivityEvents(config) {
    const events = config?.activityEvents;
    if (events === undefined) {
        return [...DEFAULT_ACTIVITY_EVENTS];
    }
    if (
        !Array.isArray(events) ||
        events.length === 0 ||
        !events.every((e) => typeof e === 'string' && e.length > 0)
    ) {
        diag.warn(
            `Invalid "session.activityEvents" value. Using ${DEFAULT_ACTIVITY_EVENTS.join(', ')}.`
        );
        return [...DEFAULT_ACTIVITY_EVENTS];
    }
    // Custom events are valid, so unknown names are kept and only reported
    for (const name of events) {
        if (!isKnownEvent(name)) {
            diag.warn(
                `Unknown event "${name}" in "session.activityEvents". Event names are case sensitive, check for typos.`
            );
        }
    }
    return [...events];
}

/**
 * Listens in the capture phase so handlers calling `stopPropagation()`
 * can't hide activity. Untrusted events are ignored so scripts dispatching
 * synthetic events can't keep a session alive.
 * @param {{recordActivity: (opts?: {renew?: boolean}) => void}} manager
 * @param {readonly string[]} events
 * @param {(event: Event) => boolean} [isTrusted]
 * @returns {() => void} stop tracking
 */
export function trackUserActivity(
    manager,
    events,
    isTrusted = (event) => event.isTrusted
) {
    const win = globalThis.window;
    if (!win) {
        return () => {};
    }
    const doc = globalThis.document;
    const onActivity = (/** @type {Event} */ event) => {
        if (isTrusted(event)) {
            manager.recordActivity();
        }
    };
    // Someone looking at the tab is presence, not intent: it can extend a
    // session but not start one.
    const onVisibility = () => {
        if (doc.visibilityState === 'visible') {
            manager.recordActivity({renew: false});
        }
    };
    const options = {capture: true, passive: true};
    for (const event of events) {
        win.addEventListener(event, onActivity, options);
    }
    doc?.addEventListener('visibilitychange', onVisibility, options);
    return () => {
        for (const event of events) {
            win.removeEventListener(event, onActivity, options);
        }
        doc?.removeEventListener('visibilitychange', onVisibility, options);
    };
}

/**
 * Public session API. A no-op when sessions are unavailable so callers
 * don't need to check.
 * @param {SessionManager | undefined} manager
 * @returns {SessionApi}
 */
export function createSessionApi(manager) {
    return {
        getSession() {
            const session = manager?.getSession();
            return session && toSessionInfo(session);
        },
        addObserver(observer) {
            return manager ? manager.addObserver(observer) : () => {};
        },
    };
}

/** @enum {number} */
export const SamplingDecision = {
    NOT_RECORD: 0,
    RECORD: 1,
};
/**
 * @typedef {Object} SamplingResult
 * @property {SamplingDecision} decision
 */

/**
 *
 */
export class SessionSampler {
    /** @param {number} ratio */
    constructor(ratio) {
        if (typeof ratio !== 'number' || isNaN(ratio)) {
            diag.warn(
                `session sampling rate must be a valid number. Using default.`
            );
            this._ratio = 1;
        } else if (ratio < 0 || ratio > 1) {
            const clamped = Math.min(Math.max(ratio, 0), 1);
            diag.warn(
                `session sampling rate must be between 0 and 1. Using ${clamped}.`
            );
            this._ratio = clamped;
        } else {
            this._ratio = ratio;
        }
        // Precision will be te to 4 decimal digits (smallest is 0.01%)
        this._ratio = Math.round(this._ratio * 10000) / 10000;
    }

    get ratio() {
        return this._ratio;
    }

    /**
     * @param {string} sessionId
     * @returns {SamplingResult}
     */
    shouldSample(sessionId) {
        if (this._ratio === 0) {
            return {decision: SamplingDecision.NOT_RECORD};
        } else if (this._ratio === 1) {
            return {decision: SamplingDecision.RECORD};
        }

        const clean = sessionId.replace(/-/g, '').toLowerCase();
        const value = parseInt(clean.slice(0, 8), 16);
        const probability = value / 0xffffffff;
        if (probability < this._ratio) {
            return {decision: SamplingDecision.RECORD};
        }
        return {decision: SamplingDecision.NOT_RECORD};
    }

    toString() {
        return `SessionSampler(ratio=${this._ratio})`;
    }
}

/** @typedef {import('@opentelemetry/sdk-trace').SpanProcessor} SpanProcessor */
/**
 * @typedef {Object} SessionSpanProcessorOptions
 * @property {SessionManager} manager
 * @property {SpanProcessor[]} processors
 */

/**
 * @param {SessionState | undefined} session
 * @param {string} tabId
 * @returns {import('@opentelemetry/api').Attributes}
 */
function sessionToAttributes(session, tabId) {
    /** @type {import('@opentelemetry/api').Attributes} */
    const attributes = {[ATTR_BROWSER_TAB_ID]: tabId};
    if (session) {
        attributes[ATTR_SESSION_ID] = session.id;
        attributes[ATTR_SESSION_SAMPLING_RATE] = session.samplingRate;
        if (session.previousId) {
            attributes[ATTR_SESSION_PREVIOUS_ID] = session.previousId;
        }
    }
    return attributes;
}

/**
 * Adds session attributes on span start and lets only the spans of sampled
 * sessions reach the wrapped processors.
 * @implements {SpanProcessor}
 */
export class SessionSpanProcessor {
    /** @param {SessionSpanProcessorOptions} options */
    constructor(options) {
        this._manager = options.manager;
        this._processors = options.processors;
        this._sampledSpans = new WeakSet();
    }
    /**
     * @param {import('@opentelemetry/sdk-trace').Span} span
     * @param {import('@opentelemetry/api').Context} ctx
     */
    onStart(span, ctx) {
        const session = this._manager.getSession();
        const sampled = session
            ? session.sampled
            : this._manager.exportsWithoutSession();
        if (sampled) {
            span.setAttributes(
                sessionToAttributes(session, this._manager.getTabId())
            );
            for (const p of this._processors) {
                p.onStart(span, ctx);
            }
            // track which Spans have been sampled
            this._sampledSpans.add(span);
        }
    }
    /** @param {import('@opentelemetry/sdk-trace').Span} span */
    onEnd(span) {
        if (this._sampledSpans.has(span)) {
            for (const p of this._processors) {
                p.onEnd(span);
            }
            this._sampledSpans.delete(span);
        }
    }
    forceFlush() {
        return Promise.all(this._processors.map((p) => p.forceFlush())).then(
            () => undefined
        );
    }
    shutdown() {
        return Promise.all(this._processors.map((p) => p.shutdown())).then(
            () => undefined
        );
    }
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
    constructor(options) {
        this._manager = options.manager;
        this._processors = options.processors;
    }
    /**
     * @param {import('@opentelemetry/sdk-logs').SdkLogRecord} logRecord
     * @param {import('@opentelemetry/api').Context} [ctx]
     */
    onEmit(logRecord, ctx) {
        const session = this._manager.getSession();
        const sampled = session
            ? session.sampled
            : this._manager.exportsWithoutSession();
        if (sampled) {
            logRecord.setAttributes(
                sessionToAttributes(session, this._manager.getTabId())
            );
            for (const p of this._processors) {
                p.onEmit(logRecord, ctx);
            }
        }
    }
    forceFlush() {
        return Promise.all(this._processors.map((p) => p.forceFlush())).then(
            () => undefined
        );
    }
    shutdown() {
        return Promise.all(this._processors.map((p) => p.shutdown())).then(
            () => undefined
        );
    }
}

/**
 * UUID v4 as required by semantic conventions. IDs feed sampling decisions so
 * a CSPRNG is preferred; `randomUUID` needs a secure context while
 * `getRandomValues` does not.
 * @returns {string}
 */
export function generateUUID() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return [
        hex.slice(0, 4).join(''),
        hex.slice(4, 6).join(''),
        hex.slice(6, 8).join(''),
        hex.slice(8, 10).join(''),
        hex.slice(10, 16).join(''),
    ].join('-');
}

// -- helper functions

// Browsers only expose `on<event>` for touch events when touch is
// supported, so UI events can't be told apart from typos by that alone.
const KNOWN_EVENTS = new Set([
    'click',
    'dblclick',
    'auxclick',
    'contextmenu',
    'mousedown',
    'mouseup',
    'mousemove',
    'pointerdown',
    'pointerup',
    'pointermove',
    'keydown',
    'keyup',
    'keypress',
    'scroll',
    'wheel',
    'touchstart',
    'touchmove',
    'touchend',
    'touchcancel',
    'input',
    'beforeinput',
    'change',
    'submit',
    'focusin',
    'focusout',
    'select',
    'copy',
    'cut',
    'paste',
    'dragstart',
    'drop',
    'resize',
    'visibilitychange',
]);

/** @param {string} name */
function isKnownEvent(name) {
    return (
        KNOWN_EVENTS.has(name) ||
        (typeof window !== 'undefined' && `on${name}` in window)
    );
}

/**
 * @param {unknown} config
 * @returns {SessionConfig}
 */
function normalizeSessionConfig(config) {
    if (config === undefined || config === null) {
        return {};
    }
    if (typeof config !== 'object') {
        diag.warn('Invalid "session" configuration. Using the defaults.');
        return {};
    }
    return config;
}

/**
 * @param {SessionState} session
 * @returns {SessionInfo}
 */
function toSessionInfo(session) {
    return {
        id: session.id,
        previousId: session.previousId,
        startTimestamp: session.startTimestamp,
    };
}

/**
 * @param {string} name
 * @param {unknown} value
 * @param {number} defaultValue
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function resolveSeconds(name, value, defaultValue, min, max) {
    const fallback = Math.min(defaultValue, max);
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        diag.warn(
            `Invalid "session.${name}" value: ${value}. Using ${fallback}s.`
        );
        return fallback;
    }
    if (value < min || value > max) {
        const clamped = Math.min(Math.max(value, min), max);
        diag.warn(
            `"session.${name}" must be between ${min}s and ${max}s. Using ${clamped}s.`
        );
        return clamped;
    }
    return value;
}

/**
 * Accessing storage can throw (sandboxed iframes, blocked site data) and
 * some browsers expose it with a zero quota, so a write probe is needed.
 * @param {'localStorage' | 'sessionStorage'} name
 * @returns {Storage | undefined}
 */
function getStorage(name) {
    try {
        const storage = globalThis[name];
        const probe = `${SESSION_STORAGE_KEY}.probe`;
        storage.setItem(probe, probe);
        storage.removeItem(probe);
        return storage;
    } catch {
        return undefined;
    }
}

/**
 * Duplicated tabs inherit `sessionStorage` from the original one, so they
 * share the tab ID until a dedup mechanism is added.
 * @param {Storage} storage
 * @returns {string}
 */
function getOrCreateTabId(storage) {
    try {
        const existing = storage.getItem(TAB_STORAGE_KEY);
        if (existing) {
            return existing;
        }
    } catch (err) {
        diag.debug('Tab storage read failed', err);
    }
    const id = generateUUID();
    try {
        storage.setItem(TAB_STORAGE_KEY, id);
    } catch (err) {
        diag.debug('Tab storage write failed', err);
    }
    return id;
}

/**
 * @param {string} raw
 * @returns {SessionState | undefined}
 */
function parseSession(raw) {
    try {
        const s = JSON.parse(raw);
        if (
            typeof s?.id === 'string' &&
            typeof s.startTimestamp === 'number' &&
            typeof s.lastActivityTimestamp === 'number' &&
            typeof s.sampled === 'boolean' &&
            typeof s.samplingRate === 'number'
        ) {
            return {
                id: s.id,
                previousId:
                    typeof s.previousId === 'string' ? s.previousId : undefined,
                startTimestamp: s.startTimestamp,
                lastActivityTimestamp: s.lastActivityTimestamp,
                sampled: s.sampled,
                samplingRate: s.samplingRate,
            };
        }
    } catch {
        // fall through
    }
    return undefined;
}
