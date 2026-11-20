/** @typedef {import('./manager.js').SessionManager} SessionManager */
/** @typedef {import('./state.js').SessionInfo} SessionInfo */
/**
 * @typedef {{
 *   'session:start': (current: SessionInfo, previous?: SessionInfo) => void;
 *   'session:end': (session: SessionInfo) => void;
 * }} SessionEvents
 */
/**
 * @typedef {<K extends keyof SessionEvents>(eventName: K, handler: SessionEvents[K]) => () => void} ObserveFn
 */
/**
 * @typedef {Object} SessionApi
 * @property {() => SessionInfo | undefined} getSession
 * @property {ObserveFn} observe
 * @property {() => void} endSession
 */
/**
 * Public session API. A no-op when sessions are unavailable so callers
 * don't need to check.
 * @param {SessionManager | undefined} manager
 * @returns {SessionApi}
 */
export function createSessionApi(manager: SessionManager | undefined): SessionApi;
export type SessionManager = import("./manager.js").SessionManager;
export type SessionInfo = import("./state.js").SessionInfo;
export type SessionEvents = {
    "session:start": (current: SessionInfo, previous?: SessionInfo) => void;
    "session:end": (session: SessionInfo) => void;
};
export type ObserveFn = <K extends keyof SessionEvents>(eventName: K, handler: SessionEvents[K]) => () => void;
export type SessionApi = {
    getSession: () => SessionInfo | undefined;
    observe: ObserveFn;
    endSession: () => void;
};
