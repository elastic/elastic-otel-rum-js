/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

import {generateUUID} from './id.js';

/** @typedef {import('./state.js').SessionState} SessionState */

export const SESSION_STORAGE_KEY = 'elastic_otel_browser.session';
export const TAB_STORAGE_KEY = 'elastic_otel_browser.tab';

/**
 * Session shared by all tabs of the same origin. Synchronous, unlike the
 * upstream `SessionStore`, since every span and log record reads it.
 */
export class SessionStore {
    /** @param {Storage} storage */
    constructor(storage) {
        this._storage = storage;
        // Last session read from or written to storage. Also keeps the
        // session in memory when storage writes fail.
        /** @type {SessionState | undefined} */
        this._session = undefined;
        this._persistent = true;
    }

    /** @returns {SessionState | undefined} */
    get() {
        if (!this._persistent) {
            return this._session;
        }
        // Read storage on every call so sessions rotated by other tabs are
        // picked up without `storage` event listeners.
        try {
            const raw = this._storage.getItem(SESSION_STORAGE_KEY);
            this._session = raw ? parseSession(raw) : undefined;
        } catch (err) {
            diag.debug('Session storage read failed', err);
        }
        return this._session;
    }

    /** @param {SessionState} session */
    save(session) {
        this._session = session;
        if (!this._persistent) {
            return;
        }
        try {
            this._storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        } catch (err) {
            // e.g. quota exceeded. Without this the stale stored value would
            // force a rotation on every read.
            this._persistent = false;
            diag.warn(
                'Session storage write failed, keeping it in memory',
                err
            );
        }
    }
}

/**
 * Accessing storage can throw (sandboxed iframes, blocked site data) and
 * some browsers expose it with a zero quota, so a write probe is needed.
 * @param {'localStorage' | 'sessionStorage'} name
 * @returns {Storage | undefined}
 */
export function getStorage(name) {
    try {
        const storage = globalThis[name];
        const probe = `${SESSION_STORAGE_KEY}.probe`;
        storage.setItem(probe, probe);
        storage.removeItem(probe);
        return storage;
    } catch {
        return undefined;
    }
}

/**
 * Duplicated tabs inherit `sessionStorage` from the original one, so they
 * share the tab ID until a dedup mechanism is added.
 * @param {Storage} storage
 * @returns {string}
 */
export function getOrCreateTabId(storage) {
    try {
        const existing = storage.getItem(TAB_STORAGE_KEY);
        if (existing) {
            return existing;
        }
    } catch (err) {
        diag.debug('Tab storage read failed', err);
    }
    const id = generateUUID();
    try {
        storage.setItem(TAB_STORAGE_KEY, id);
    } catch (err) {
        diag.debug('Tab storage write failed', err);
    }
    return id;
}

/**
 * @param {string} raw
 * @returns {SessionState | undefined}
 */
function parseSession(raw) {
    try {
        const s = JSON.parse(raw);
        if (
            typeof s?.id === 'string' &&
            typeof s.startTimestamp === 'number' &&
            typeof s.lastActivityTimestamp === 'number' &&
            typeof s.sampled === 'boolean' &&
            typeof s.samplingRate === 'number'
        ) {
            /** @type {SessionState} */
            const session = {
                id: s.id,
                previousId:
                    typeof s.previousId === 'string' ? s.previousId : undefined,
                startTimestamp: s.startTimestamp,
                lastActivityTimestamp: s.lastActivityTimestamp,
                sampled: s.sampled,
                samplingRate: s.samplingRate,
            };
            if (s.ended === true) {
                session.ended = true;
            }
            return session;
        }
    } catch {
        // fall through
    }
    return undefined;
}
