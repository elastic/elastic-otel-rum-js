/**
 * @param {string} id
 * @param {number} now
 * @param {SessionState | undefined} previous the session being replaced
 * @param {SessionSampler} sampler
 * @returns {SessionState}
 */
export function createSession(id: string, now: number, previous: SessionState | undefined, sampler: SessionSampler): SessionState;
/**
 * @param {SessionState} session
 * @param {number} now
 * @param {SessionLimits} limits
 */
export function isExpired(session: SessionState, now: number, limits: SessionLimits): boolean;
/**
 * @param {SessionState} session
 * @param {SessionLimits} limits
 * @returns {number}
 */
export function getExpiryTime(session: SessionState, limits: SessionLimits): number;
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
export const ACTIVITY_WRITE_THROTTLE_MS: 5000;
/**
 * Single pending expiry check. Timers are throttled in background tabs, so
 * callers must not rely on it firing on time.
 */
export class ExpiryTimer {
    /**
     * @param {() => number} now
     * @param {Timers} [timers]
     */
    constructor(now: () => number, timers?: Timers);
    _now: () => number;
    _timers: Timers;
    /** @type {unknown} */
    _timer: unknown;
    _expiresAt: number;
    /** Time of the scheduled check, 0 when none is. */
    get expiresAt(): number;
    /**
     * @param {number} expiresAt
     * @param {() => void} onExpire
     */
    schedule(expiresAt: number, onExpire: () => void): void;
    clear(): void;
}
export type SessionState = import("./state.js").SessionState;
export type SessionSampler = import("./sampler.js").SessionSampler;
export type SessionLimits = {
    inactivityMs: number;
    maxDurationMs: number;
};
export type Timers = {
    setTimeout: (fn: () => void, ms: number) => unknown;
    clearTimeout: (timer: any) => void;
};
