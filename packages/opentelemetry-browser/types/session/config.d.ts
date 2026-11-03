/**
 * @param {unknown} config
 * @returns {SessionConfig}
 */
export function normalizeSessionConfig(config: unknown): SessionConfig;
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
 * @typedef {Object} SessionConfig
 * @property {number} [inactivityTimeout] // seconds, defaults to 30 minutes
 * @property {number} [maxDuration] // seconds, defaults to 4 hours
 * @property {string[]} [activityEvents] // DOM events that count as user activity
 * @property {number} [sampleRate] // within [0..1] range, default 1
 */
export const DEFAULT_INACTIVITY_TIMEOUT_S: number;
export const DEFAULT_MAX_DURATION_S: number;
export type SessionConfig = {
    inactivityTimeout?: number | undefined;
    maxDuration?: number | undefined;
    activityEvents?: string[] | undefined;
    sampleRate?: number | undefined;
};
