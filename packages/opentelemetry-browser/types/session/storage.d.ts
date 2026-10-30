/**
 * Accessing storage can throw (sandboxed iframes, blocked site data) and
 * some browsers expose it with a zero quota, so a write probe is needed.
 * @param {'localStorage' | 'sessionStorage'} name
 * @returns {Storage | undefined}
 */
export function getStorage(name: "localStorage" | "sessionStorage"): Storage | undefined;
/**
 * Duplicated tabs inherit `sessionStorage` from the original one, so they
 * share the tab ID until a dedup mechanism is added.
 * @param {Storage} storage
 * @returns {string}
 */
export function getOrCreateTabId(storage: Storage): string;
/** @typedef {import('./state.js').SessionState} SessionState */
export const SESSION_STORAGE_KEY: "elastic_otel_browser.session";
export const TAB_STORAGE_KEY: "elastic_otel_browser.tab";
/**
 * Session shared by all tabs of the same origin. Synchronous, unlike the
 * upstream `SessionStore`, since every span and log record reads it.
 */
export class SessionStore {
    /** @param {Storage} storage */
    constructor(storage: Storage);
    _storage: Storage;
    /** @type {SessionState | undefined} */
    _session: SessionState | undefined;
    _persistent: boolean;
    /** @returns {SessionState | undefined} */
    get(): SessionState | undefined;
    /** @param {SessionState} session */
    save(session: SessionState): void;
}
export type SessionState = import("./state.js").SessionState;
