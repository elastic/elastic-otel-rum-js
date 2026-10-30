/**
 * Invalid values fall back to defaults so a typo never leaves sessions
 * without any activity signal.
 * @param {SessionConfig | null | undefined} config
 * @returns {string[]}
 */
export function resolveActivityEvents(config: SessionConfig | null | undefined): string[];
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
/** @typedef {import('./config.js').SessionConfig} SessionConfig */
/** @type {readonly string[]} */
export const DEFAULT_ACTIVITY_EVENTS: readonly string[];
export type SessionConfig = import("./config.js").SessionConfig;
