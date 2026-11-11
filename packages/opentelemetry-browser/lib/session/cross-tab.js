/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {parseStoredSession, SESSION_STORAGE_KEY} from './storage.js';

/** @typedef {import('./state.js').SessionState} SessionState */

/**
 * Cross-tab changes that must bypass the activity read throttle and refresh
 * local session state from storage.
 *
 * @param {SessionState | undefined} stored parsed `storage` event `newValue`
 * @param {SessionState | undefined} announced session this tab last announced
 * @returns {boolean}
 */
export function shouldSyncSessionFromStorage(stored, announced) {
    if (!announced) {
        return stored?.ended === true;
    }
    if (stored == null) {
        return true;
    }
    if (stored.ended === true && stored.id === announced.id) {
        return true;
    }
    if (stored.id !== announced.id) {
        return true;
    }
    return false;
}

/**
 * @param {Storage} sessionStorage
 * @param {(newValue: string | null) => void} onRemoteChange
 * @returns {() => void}
 */
export function trackSessionStorageChanges(sessionStorage, onRemoteChange) {
    const win = globalThis.window;
    if (!win?.addEventListener) {
        return () => {};
    }
    const onStorage = (/** @type {StorageEvent} */ event) => {
        if (event.storageArea !== sessionStorage) {
            return;
        }
        if (event.key !== SESSION_STORAGE_KEY) {
            return;
        }
        onRemoteChange(event.newValue);
    };
    win.addEventListener('storage', onStorage);
    return () => win.removeEventListener('storage', onStorage);
}

/**
 * @param {string | null} raw
 * @returns {SessionState | undefined}
 */
export function sessionFromStorageEvent(raw) {
    if (!raw) {
        return undefined;
    }
    return parseStoredSession(raw);
}
