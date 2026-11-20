/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

import {toSessionInfo} from './state.js';

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
export function createSessionApi(manager) {
    return {
        getSession() {
            const session = manager?.getSession();
            return session && toSessionInfo(session);
        },
        /**
         * @param {any} eventName
         * @param {any} handler
         */
        observe(eventName, handler) {
            if (manager) {
                if (eventName === 'session:start') {
                    return manager.addObserver({onSessionStarted: handler});
                } else if (eventName === 'session:end') {
                    return manager.addObserver({onSessionEnded: handler});
                }
                diag.debug(`Cannot observe unknown event "${eventName}".`);
            }
            return () => {};
        },
        endSession() {
            manager?.endSession();
        },
    };
}
