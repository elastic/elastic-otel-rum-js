/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

import {toSessionInfo} from './state.js';

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
            if (typeof handler !== 'function') {
                diag.debug(
                    `Cannot observe "${eventName}" with a non-function handler.`
                );
                return () => {};
            }
            if (eventName === 'session:start') {
                return manager
                    ? manager.addObserver({onSessionStarted: handler})
                    : () => {};
            }
            if (eventName === 'session:end') {
                return manager
                    ? manager.addObserver({onSessionEnded: handler})
                    : () => {};
            }
            diag.debug(`Cannot observe unknown event "${eventName}".`);
            return () => {};
        },
        endSession() {
            manager?.endSession();
        },
    };
}
