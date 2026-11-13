/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {toSessionInfo} from './state.js';

/** @typedef {import('./manager.js').SessionManager} SessionManager */

/**
 * @typedef {Object} SessionApi
 * @property {() => import('./state.js').SessionInfo | undefined} getSession
 * @property {(observer: import('./observers.js').SessionObserver) => () => void} addObserver
 * @property {() => void} endSession
 */

/**
 * Public session API. A no-op when sessions are unavailable so callers
 * don't need to check.
 * @param {SessionManager | undefined} manager
 * @returns {SessionApi}
 */
export function createSessionApi(manager) {
    return {
        getSession() {
            const session = manager?.getSession();
            return session && toSessionInfo(session);
        },
        addObserver(observer) {
            return manager ? manager.addObserver(observer) : () => {};
        },
        endSession() {
            manager?.endSession();
        },
    };
}
