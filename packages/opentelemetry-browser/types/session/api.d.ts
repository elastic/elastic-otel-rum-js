/** @typedef {import('./manager.js').SessionManager} SessionManager */
/** @typedef {import('./state.js').SessionInfo} SessionInfo */
/**
 * @callback ObserveSessionStartFn
 * @param {'session:start'} eventName
 * @param {(current: SessionInfo, previous?: SessionInfo) => void} sessionStartHandler
 * @returns {() => void}
 */
/**
 * @callback ObserveSessionEndFn
 * @param {'session:end'} eventName
 * @param {(session: SessionInfo) => void} sessionEndHandler
 * @returns {() => void}
 */
/**
 * @typedef {Object} SessionApi
 * @property {() => SessionInfo | undefined} getSession
 * @property {ObserveSessionStartFn & ObserveSessionEndFn} observe
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
export type ObserveSessionStartFn = (eventName: "session:start", sessionStartHandler: (current: SessionInfo, previous?: SessionInfo) => void) => () => void;
export type ObserveSessionEndFn = (eventName: "session:end", sessionEndHandler: (session: SessionInfo) => void) => () => void;
export type SessionApi = {
    getSession: () => SessionInfo | undefined;
    observe: ObserveSessionStartFn & ObserveSessionEndFn;
    endSession: () => void;
};
