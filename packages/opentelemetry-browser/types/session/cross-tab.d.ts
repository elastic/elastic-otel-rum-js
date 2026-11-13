/** @typedef {import('./state.js').SessionState} SessionState */
/**
 * Cross-tab changes that must bypass the activity read throttle and refresh
 * local session state from storage.
 *
 * @param {SessionState | undefined} stored parsed `storage` event `newValue`
 * @param {SessionState | undefined} announced session this tab last announced
 * @returns {boolean}
 */
export function shouldSyncSessionFromStorage(stored: SessionState | undefined, announced: SessionState | undefined): boolean;
/**
 * @param {Storage} sessionStorage
 * @param {(newValue: string | null) => void} onRemoteChange
 * @returns {() => void}
 */
export function trackSessionStorageChanges(sessionStorage: Storage, onRemoteChange: (newValue: string | null) => void): () => void;
/**
 * @param {string | null} raw
 * @returns {SessionState | undefined}
 */
export function sessionFromStorageEvent(raw: string | null): SessionState | undefined;
export type SessionState = import("./state.js").SessionState;
