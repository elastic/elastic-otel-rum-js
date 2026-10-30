/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {SamplingDecision} from './sampler.js';

/** @typedef {import('./state.js').SessionState} SessionState */
/** @typedef {import('./sampler.js').SessionSampler} SessionSampler */

/**
 * @typedef {Object} SessionLimits
 * @property {number} inactivityMs
 * @property {number} maxDurationMs
 */

/**
 * @typedef {Object} Timers
 * @property {(fn: () => void, ms: number) => unknown} setTimeout
 * @property {(timer: any) => void} clearTimeout
 */

// Bounds localStorage writes when telemetry is emitted in bursts
export const ACTIVITY_WRITE_THROTTLE_MS = 5_000;
// RUM session spec: no session ID is kept around for more than 24 hours
const PREVIOUS_ID_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// A stored session further ahead than this means the clock was moved back
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
// Longer delays overflow in browsers and fire immediately
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;

/**
 * @param {string} id
 * @param {number} now
 * @param {SessionState | undefined} previous the session being replaced
 * @param {SessionSampler} sampler
 * @returns {SessionState}
 */
export function createSession(id, now, previous, sampler) {
    return {
        id,
        previousId:
            previous && now - previous.startTimestamp < PREVIOUS_ID_MAX_AGE_MS
                ? previous.id
                : undefined,
        startTimestamp: now,
        lastActivityTimestamp: now,
        sampled: sampler.shouldSample(id).decision === SamplingDecision.RECORD,
        samplingRate: sampler.ratio,
    };
}

/**
 * @param {SessionState} session
 * @param {number} now
 * @param {SessionLimits} limits
 */
export function isExpired(session, now, limits) {
    // Ages would be negative and the session would never end
    const ahead =
        Math.max(session.startTimestamp, session.lastActivityTimestamp) - now;
    return (
        ahead > MAX_CLOCK_SKEW_MS ||
        now - session.lastActivityTimestamp >= limits.inactivityMs ||
        now - session.startTimestamp >= limits.maxDurationMs
    );
}

/**
 * @param {SessionState} session
 * @param {SessionLimits} limits
 * @returns {number}
 */
export function getExpiryTime(session, limits) {
    return Math.min(
        session.lastActivityTimestamp + limits.inactivityMs,
        session.startTimestamp + limits.maxDurationMs
    );
}

/**
 * Single pending expiry check. Timers are throttled in background tabs, so
 * callers must not rely on it firing on time.
 */
export class ExpiryTimer {
    /**
     * @param {() => number} now
     * @param {Timers} [timers]
     */
    constructor(now, timers) {
        this._now = now;
        // Resolved on each call so patched timers (e.g. fake clocks) apply
        this._timers = timers ?? {
            setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
            clearTimeout: (timer) => globalThis.clearTimeout(timer),
        };
        /** @type {unknown} */
        this._timer = undefined;
        this._expiresAt = 0;
    }

    /** Time of the scheduled check, 0 when none is. */
    get expiresAt() {
        return this._expiresAt;
    }

    /**
     * @param {number} expiresAt
     * @param {() => void} onExpire
     */
    schedule(expiresAt, onExpire) {
        this.clear();
        this._expiresAt = expiresAt;
        this._timer = this._timers.setTimeout(
            () => {
                this._timer = undefined;
                onExpire();
            },
            Math.min(MAX_TIMER_DELAY_MS, Math.max(0, expiresAt - this._now()))
        );
    }

    clear() {
        this._expiresAt = 0;
        if (this._timer !== undefined) {
            this._timers.clearTimeout(this._timer);
            this._timer = undefined;
        }
    }
}
