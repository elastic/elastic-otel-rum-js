/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

import {
    DEFAULT_INACTIVITY_TIMEOUT_S,
    DEFAULT_MAX_DURATION_S,
    normalizeSessionConfig,
    resolveSessionTimeouts,
} from './config.js';
import {generateUUID} from './id.js';
import {
    ACTIVITY_WRITE_THROTTLE_MS,
    createSession,
    ExpiryTimer,
    getExpiryTime,
    isExpired,
} from './lifecycle.js';
import {SessionObservers} from './observers.js';
import {SessionSampler} from './sampler.js';
import {sessionToAttributes} from './state.js';
import {getOrCreateTabId, getStorage, SessionStore} from './storage.js';

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
    constructor(opts) {
        this._store = new SessionStore(opts.sessionStorage);
        /** @type {import('./lifecycle.js').SessionLimits} */
        this._limits = {
            inactivityMs:
                (opts.inactivityTimeout ?? DEFAULT_INACTIVITY_TIMEOUT_S) * 1000,
            maxDurationMs: (opts.maxDuration ?? DEFAULT_MAX_DURATION_S) * 1000,
        };
        this._sampler = opts.sampler ?? new SessionSampler(1);
        this._now = opts.now ?? Date.now;
        this._expiry = new ExpiryTimer(this._now, opts.timers);
        this._observers = new SessionObservers();
        // Session this tab last announced to observers
        /** @type {SessionState | undefined} */
        this._announced = undefined;
        // Id of the last session created by this tab, not adopted from another
        /** @type {string | undefined} */
        this._createdId = undefined;
        this._lastActivityCheck = 0;
        this._stopped = false;
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
                now < this._expiry.expiresAt
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
        return this._observers.add(observer);
    }

    /** Stops tracking for good: no timers, reads or notifications. */
    shutdown() {
        this._stopped = true;
        this._expiry.clear();
        this._observers.clear();
        this._announced = undefined;
    }

    getTabId() {
        return this._tabId;
    }

    /**
     * Every tab sharing a session is told when it starts, this tells apart
     * the one that created it, e.g. to report the start only once.
     * @param {string} sessionId
     * @returns {boolean}
     */
    isCreatedHere(sessionId) {
        return this._createdId === sessionId;
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
        const stored = this._store.get();
        /** @type {SessionState | undefined} */
        let session;
        let extended = false;

        if (stored && !isExpired(stored, now, this._limits)) {
            session = stored;
            if (
                extend &&
                now - stored.lastActivityTimestamp >= ACTIVITY_WRITE_THROTTLE_MS
            ) {
                stored.lastActivityTimestamp = now;
                this._store.save(stored);
                extended = true;
            }
        } else if (renew) {
            session = createSession(generateUUID(), now, stored, this._sampler);
            this._createdId = session.id;
            this._store.save(session);
            diag.debug('Session started', session);
        }

        const changed = this._sync(session);
        if (session && (changed || extended)) {
            this._scheduleExpiryCheck(session);
        }
        return session;
    }

    /**
     * Updates the session this tab is on before telling observers, so reads
     * made from a callback (telemetry) can't announce the same change a
     * second time.
     * @param {SessionState | undefined} session
     * @returns {boolean} whether the active session changed
     */
    _sync(session) {
        const previous = this._announced;
        if (previous?.id === session?.id) {
            return false;
        }

        this._announced = session && {...session};
        if (previous) {
            this._expiry.clear();
        }
        this._observers.publish(previous, session);
        return true;
    }

    /**
     * Storage is re-checked when the timer fires since another tab may have
     * extended the session.
     * @param {SessionState} session
     */
    _scheduleExpiryCheck(session) {
        this._expiry.schedule(getExpiryTime(session, this._limits), () => {
            const current = this._resolve(this._now(), {
                extend: false,
                renew: false,
            });
            if (current) {
                this._scheduleExpiryCheck(current);
            }
        });
    }
}

/**
 * Returns `undefined` when sessions cannot outlive a page reload so EDOT
 * doesn't report IDs that would split a single user session.
 * @param {SessionConfig | null} [config]
 * @returns {SessionManager | undefined}
 */
export function createSessionManager(config) {
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
    });
}
