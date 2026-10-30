/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    ATTR_BROWSER_TAB_ID,
    ATTR_SESSION_ID,
    ATTR_SESSION_PREVIOUS_ID,
    ATTR_SESSION_SAMPLING_RATE,
} from '../semconv.js';

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
export function toSessionInfo(session) {
    return {
        id: session.id,
        previousId: session.previousId,
        startTimestamp: session.startTimestamp,
        sampled: session.sampled,
    };
}

/**
 * @param {SessionState | undefined} session
 * @param {string} tabId
 * @returns {import('@opentelemetry/api').Attributes}
 */
export function sessionToAttributes(session, tabId) {
    /** @type {import('@opentelemetry/api').Attributes} */
    const attributes = {[ATTR_BROWSER_TAB_ID]: tabId};
    if (session) {
        attributes[ATTR_SESSION_ID] = session.id;
        attributes[ATTR_SESSION_SAMPLING_RATE] = session.samplingRate;
        if (session.previousId) {
            attributes[ATTR_SESSION_PREVIOUS_ID] = session.previousId;
        }
    }
    return attributes;
}
