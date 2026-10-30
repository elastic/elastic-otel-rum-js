/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

import {toSessionInfo} from './state.js';

/** @typedef {import('./state.js').SessionInfo} SessionInfo */
/** @typedef {import('./state.js').SessionState} SessionState */

/**
 * Same shape as the upstream `SessionObserver`, with optional callbacks.
 * @typedef {Object} SessionObserver
 * @property {(session: SessionInfo, previous?: SessionInfo) => void} [onSessionStarted]
 * @property {(session: SessionInfo) => void} [onSessionEnded]
 */

/**
 * Delivers session changes to observers. Events are queued and delivered in
 * order by a single loop, so a change published from a callback (e.g. a read
 * made by telemetry) is delivered after the current one.
 */
export class SessionObservers {
    constructor() {
        /** @type {Set<{observer: SessionObserver}>} */
        this._observers = new Set();
        /** @type {Array<{type: 'ended' | 'started', session: SessionState}>} */
        this._events = [];
        /** @type {SessionState | undefined} */
        this._lastEnded = undefined;
        this._flushing = false;
    }

    /**
     * @param {SessionObserver} observer
     * @returns {() => void} unsubscribe
     */
    add(observer) {
        // Wrapped so adding the same object twice can be unsubscribed
        // separately, while its methods keep their `this`.
        const entry = {observer};
        this._observers.add(entry);
        return () => {
            this._observers.delete(entry);
        };
    }

    clear() {
        this._observers.clear();
    }

    /**
     * @param {SessionState | undefined} ended
     * @param {SessionState | undefined} started
     */
    publish(ended, started) {
        if (ended) {
            this._lastEnded = ended;
            this._events.push({type: 'ended', session: ended});
        }
        if (started) {
            this._events.push({type: 'started', session: started});
        }
        this._flush();
    }

    _flush() {
        if (this._flushing) {
            return;
        }
        this._flushing = true;
        try {
            for (let event; (event = this._events.shift()); ) {
                const {session} = event;
                if (event.type === 'ended') {
                    this._notify((o) =>
                        o.onSessionEnded?.(toSessionInfo(session))
                    );
                    continue;
                }
                // Only the real previous session: this tab may have missed
                // others that ran while it was idle.
                const ended = this._lastEnded;
                const previous =
                    ended && ended.id === session.previousId
                        ? toSessionInfo(ended)
                        : undefined;
                this._notify((o) =>
                    o.onSessionStarted?.(toSessionInfo(session), previous)
                );
            }
        } finally {
            this._flushing = false;
        }
    }

    /** @param {(observer: SessionObserver) => void} call */
    _notify(call) {
        for (const {observer} of [...this._observers]) {
            try {
                call(observer);
            } catch (err) {
                diag.warn('Session observer failed', err);
            }
        }
    }
}
