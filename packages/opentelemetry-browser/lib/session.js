/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

import {
    ATTR_BROWSER_TAB_ID,
    ATTR_SESSION_ID,
    ATTR_SESSION_PREVIOUS_ID,
} from './semconv.js';

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
        this._onSessionStart = opts.onSessionStart;
        this._now = opts.now ?? Date.now;
        /** @type {SessionState | undefined} */
        this._cached = undefined;
        this._persistent = true;
        this._tabId = getOrCreateTabId(opts.tabStorage);
    }

    /**
     * Implements upstream `SessionProvider` so it can be plugged into
     * `@opentelemetry/browser-sdk/session` processors.
     * @returns {string}
     */
    getSessionId() {
        return this.getSession().id;
    }

    /**
     * Returns the active session, rotating it if expired. Every call counts
     * as activity since it happens when telemetry is produced.
     * @returns {SessionState}
     */
    getSession() {
        const now = this._now();
        const stored = this._read();

        if (!stored || this._isExpired(stored, now)) {
            /** @type {SessionState} */
            const session = {
                id: generateUUID(),
                previousId:
                    stored &&
                    now - stored.startTimestamp < PREVIOUS_ID_MAX_AGE_MS
                        ? stored.id
                        : undefined,
                startTimestamp: now,
                lastActivityTimestamp: now,
            };
            this._write(session);
            diag.debug('Session started', session);
            this._onSessionStart?.(session);
            return session;
        }

        if (now - stored.lastActivityTimestamp >= ACTIVITY_WRITE_THROTTLE_MS) {
            stored.lastActivityTimestamp = now;
            this._write(stored);
        }
        return stored;
    }

    /** @returns {import('@opentelemetry/api').Attributes} */
    getAttributes() {
        const session = this.getSession();
        /** @type {import('@opentelemetry/api').Attributes} */
        const attributes = {
            [ATTR_SESSION_ID]: session.id,
            [ATTR_BROWSER_TAB_ID]: this._tabId,
        };
        if (session.previousId) {
            attributes[ATTR_SESSION_PREVIOUS_ID] = session.previousId;
        }
        return attributes;
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
}

/**
 * Returns `undefined` when sessions cannot outlive a page reload so EDOT
 * doesn't report IDs that would split a single user session.
 * @param {SessionConfig} [config]
 * @param {(session: SessionState) => void} [onSessionStart]
 * @returns {SessionManager | undefined}
 */
export function createSessionManager(config = {}, onSessionStart) {
    if (config.enabled === false) {
        return undefined;
    }
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

/** @typedef {import('@opentelemetry/sdk-trace').SpanProcessor} SpanProcessor */

/**
 * Adds session attributes on span start.
 * @implements {SpanProcessor}
 */
export class SessionSpanProcessor {
    /** @param {SessionManager} manager */
    constructor(manager) {
        this._manager = manager;
    }
    /** @param {import('@opentelemetry/sdk-trace').Span} span */
    onStart(span) {
        span.setAttributes(this._manager.getAttributes());
    }
    onEnd() {}
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
    }
}

/**
 * Adds session attributes on log emit. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 */
export class SessionLogRecordProcessor {
    /** @param {SessionManager} manager */
    constructor(manager) {
        this._manager = manager;
    }
    /** @param {{setAttributes: (attrs: import('@opentelemetry/api').Attributes) => unknown}} logRecord */
    onEmit(logRecord) {
        logRecord.setAttributes(this._manager.getAttributes());
    }
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
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
            typeof s.lastActivityTimestamp === 'number'
        ) {
            return {
                id: s.id,
                previousId:
                    typeof s.previousId === 'string' ? s.previousId : undefined,
                startTimestamp: s.startTimestamp,
                lastActivityTimestamp: s.lastActivityTimestamp,
            };
        }
    } catch {
        // fall through
    }
    return undefined;
}
