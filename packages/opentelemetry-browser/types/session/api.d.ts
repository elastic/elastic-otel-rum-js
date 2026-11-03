/** @typedef {import('./manager.js').SessionManager} SessionManager */
/**
 * @typedef {Object} SessionApi
 * @property {() => import('./state.js').SessionInfo | undefined} getSession
 * @property {(observer: import('./observers.js').SessionObserver) => () => void} addObserver
 */
/**
 * Public session API. A no-op when sessions are unavailable so callers
 * don't need to check.
 * @param {SessionManager | undefined} manager
 * @returns {SessionApi}
 */
export function createSessionApi(manager: SessionManager | undefined): SessionApi;
export type SessionManager = import("./manager.js").SessionManager;
export type SessionApi = {
    getSession: () => import("./state.js").SessionInfo | undefined;
    addObserver: (observer: import("./observers.js").SessionObserver) => () => void;
};
