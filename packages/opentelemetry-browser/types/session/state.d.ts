/**
 * Public view of a session.
 * @typedef {Object} SessionInfo
 * @property {string} id
 * @property {string} [previousId]
 * @property {number} startTimestamp
 * @property {boolean} sampled whether the session's telemetry is exported
 */
/**
 * @typedef {Object} SessionState
 * @property {string} id
 * @property {string} [previousId]
 * @property {number} startTimestamp
 * @property {number} lastActivityTimestamp
 * @property {boolean} sampled
 * @property {number} samplingRate
 */
/**
 * @param {SessionState} session
 * @returns {SessionInfo}
 */
export function toSessionInfo(session: SessionState): SessionInfo;
/**
 * @param {SessionState | undefined} session
 * @param {string} tabId
 * @returns {import('@opentelemetry/api').Attributes}
 */
export function sessionToAttributes(session: SessionState | undefined, tabId: string): import("@opentelemetry/api").Attributes;
/**
 * Public view of a session.
 */
export type SessionInfo = {
    id: string;
    previousId?: string | undefined;
    startTimestamp: number;
    /**
     * whether the session's telemetry is exported
     */
    sampled: boolean;
};
export type SessionState = {
    id: string;
    previousId?: string | undefined;
    startTimestamp: number;
    lastActivityTimestamp: number;
    sampled: boolean;
    samplingRate: number;
};
