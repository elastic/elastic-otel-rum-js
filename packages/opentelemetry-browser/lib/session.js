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

export const SESSION_STORAGE_KEY = 'elastic_otel_browser.session';
export const TAB_STORAGE_KEY = 'elastic_otel_browser.tab';

const DEFAULT_INACTIVITY_TIMEOUT_S = 30 * 60;
const DEFAULT_MAX_DURATION_S = 4 * 60 * 60;
const MIN_INACTIVITY_TIMEOUT_S = 5 * 60;
const MIN_MAX_DURATION_S = 30 * 60;
const MAX_MAX_DURATION_S = 24 * 60 * 60;
// Bounds localStorage writes when telemetry is emitted in bursts
const ACTIVITY_WRITE_THROTTLE_MS = 5_000;
// RUM session spec: no session ID is kept around for more than 24 hours
const PREVIOUS_ID_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export class SessionManager {
    /** @param {SessionManagerOptions} opts */
    constructor(opts) {
        this._store = opts.sessionStorage;
        this._inactivityMs =
            (opts.inactivityTimeout ?? DEFAULT_INACTIVITY_TIMEOUT_S) * 1000;
        this._maxDurationMs =
            (opts.maxDuration ?? DEFAULT_MAX_DURATION_S) * 1000;
        this._now = opts.now ?? Date.now;
        /** @type {SessionState | undefined} */
        this._cached = undefined;
        this._persistent = true;
        this._tabId = getOrCreateTabId(opts.tabStorage);
        this._sampler = opts.sampler;
        /** @type {Map<SessionEvent, Array<(session: SessionState) => void>>} */
        this._observers = new Map();
    }

    /**
     * Implements upstream `SessionProvider` so it can be plugged into
     * `@opentelemetry/browser-sdk/session` processors.
     * @returns {string}
     */
    getSessionId() {
        return this.getSession().id;
    }

    getTabId() {
        return this._tabId;
    }

    /**
     * Returns the active session, rotating it if expired. Every call counts
     * as activity since it happens when telemetry is produced.
     * @returns {SessionState}
     */
    getSession() {
        const now = this._now();
        const stored = this._read();
        const expired = stored && this._isExpired(stored, now);

        if (!stored || expired) {
            const id = generateUUID();
            const samplingResult = this._sampler.shouldSample(id);
            /** @type {SessionState} */
            const session = {
                id,
                previousId:
                    stored &&
                    now - stored.startTimestamp < PREVIOUS_ID_MAX_AGE_MS
                        ? stored.id
                        : undefined,
                startTimestamp: now,
                lastActivityTimestamp: now,
                sampled: samplingResult.decision === SamplingDecision.RECORD,
                samplingRate: this._sampler.ratio,
            };
            this._write(session);
            if (expired) {
                diag.debug('Session ended', stored);
                this._notify('session:end', stored);
            }
            diag.debug('Session started', session);
            this._notify('session:start', session);
            return session;
        }

        if (now - stored.lastActivityTimestamp >= ACTIVITY_WRITE_THROTTLE_MS) {
            stored.lastActivityTimestamp = now;
            this._write(stored);
        }
        return stored;
    }

    /**
     * @param {SessionEvent} event
     * @param {(session: SessionState) => void} handler
     * @returns {(() => void) | undefined}
     */
    observe(event, handler) {
        if (!/^session:(start|end)$/.test(event)) {
            diag.debug(`Session event "${event}" not recognized`);
            return;
        }
        if (typeof handler !== 'function') {
            diag.debug(
                `Handler for session event "${event}" must be a function`
            );
            return;
        }
        const handlers = this._observers.get(event) ?? [];
        handlers.push(handler);
        this._observers.set(event, handlers);
        // Allow users to remove observers
        return () => {
            const list = this._observers.get(event);
            if (list) {
                this._observers.set(
                    event,
                    list.filter((h) => h !== handler)
                );
            }
        };
    }

    /**
     * @param {SessionState} session
     * @param {number} now
     */
    _isExpired(session, now) {
        return (
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

    /**
     * Runs all observers for a given event is a safe way
     * @param {SessionEvent} event
     * @param {any} payload
     */
    _notify(event, payload) {
        const handlers = this._observers.get(event);
        if (Array.isArray(handlers)) {
            for (const handlerFn of handlers) {
                try {
                    handlerFn(payload);
                } catch (err) {
                    diag.warn(
                        `Handler for session event "${event}" failed`,
                        err
                    );
                }
            }
        }
    }
}

/**
 * Returns `undefined` when sessions cannot outlive a page reload so EDOT
 * doesn't report IDs that would split a single user session.
 * @param {SessionConfig} [config]
 * @returns {SessionManager | undefined}
 */
export function createSessionManager(config = {}) {
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
 *
 * @param {SessionState} session
 * @returns {import('@opentelemetry/api').Attributes}
 */
function sessionToAttributes(session) {
    /** @type {import('@opentelemetry/api').Attributes} */
    const attributes = {
        [ATTR_SESSION_ID]: session.id,
        [ATTR_SESSION_SAMPLING_RATE]: session.samplingRate,
    };
    if (session.previousId) {
        attributes[ATTR_SESSION_PREVIOUS_ID] = session.previousId;
    }
    return attributes;
}

/**
 * Adds session attributes on span start.
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
        if (session.sampled) {
            span.setAttributes({
                ...sessionToAttributes(session),
                [ATTR_BROWSER_TAB_ID]: this._manager.getTabId(),
            });
            for (const p of this._processors) {
                p.onStart(span, ctx);
            }
            // track which Spans have been sampled
            this._sampledSpans.add(span);
        }
    }
    /**
     * @param {import('@opentelemetry/sdk-trace').Span} span
     */
    onEnd(span) {
        // We check the Span was sampled and it contains the ID attrib
        // to discard any Spans being tampered by other processors or
        // externally
        if (
            this._sampledSpans.has(span) &&
            typeof span.attributes?.[ATTR_SESSION_ID] === 'string'
        ) {
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
 * Adds session attributes on log emit. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 */
export class SessionLogRecordProcessor {
    /** @param {SessionLogRecordProcessorOptions} options */
    constructor(options) {
        this._manager = options.manager;
        this._processors = options.processors;
    }
    /** @param {{setAttributes: (attrs: import('@opentelemetry/api').Attributes) => unknown}} logRecord */
    /**
     * @param {import('@opentelemetry/sdk-logs').SdkLogRecord} logRecord
     * @param {import('@opentelemetry/api').Context} [ctx]
     */
    onEmit(logRecord, ctx) {
        const session = this._manager.getSession();
        if (session.sampled) {
            logRecord.setAttributes({
                ...sessionToAttributes(session),
                [ATTR_BROWSER_TAB_ID]: this._manager.getTabId(),
            });
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
