/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

const SESSION_KEY = 'elastic.rum.sid';
const CHANNEL_NAME = 'elastic-rum-session';
const DEFAULT_MAX_MS = 14 * 60 * 1000; // 14 min
const DEFAULT_IDLE_MS = 30 * 60 * 1000; // 30 min

let _id = null;
let _startedAt = 0;
let _lastActivity = Date.now();
let _channel = null;
let _persistSession = false;
/** @type {(() => void) | null} */
let _onActivity = null;

/**
 * @param {{maxMs?: number, idleMs?: number, persistSession?: boolean}} [cfg]
 * @returns {string} session ID
 */
export function initSession(cfg = {}) {
    if (_id) {
        return _id;
    }

    _persistSession = cfg.persistSession === true;

    const stored = _persistSession ? _readCookie() : _readStorage();
    _id = stored || _generateUUID();
    _startedAt = Date.now();
    _lastActivity = Date.now();

    _writeSession(_id);

    _onActivity = () => {
        _lastActivity = Date.now();
        if (_persistSession) {
            _writeCookie(_id);
        }
    };
    for (const ev of ['click', 'keydown', 'scroll', 'touchstart']) {
        window.addEventListener(ev, _onActivity, {passive: true, capture: true});
    }

    try {
        _channel = new BroadcastChannel(CHANNEL_NAME);
        _channel.onmessage = (e) => {
            if (e.data && e.data.type === 'rotate') {
                _id = e.data.id;
                _startedAt = Date.now();
                _lastActivity = Date.now();
                _writeSession(_id);
            }
        };
    } catch (err) {
        diag.debug('BroadcastChannel not available', err);
    }

    return _id;
}

/** @returns {string | null} */
export function getSessionId() {
    return _id;
}

/**
 * @param {{maxMs?: number, idleMs?: number}} [cfg]
 * @param {(newId: string) => void} [onRotateFn]
 * @returns {boolean} whether rotation occurred
 */
export function checkRotation(cfg = {}, onRotateFn) {
    const maxMs = cfg.maxMs ?? DEFAULT_MAX_MS;
    const idleMs = cfg.idleMs ?? DEFAULT_IDLE_MS;
    const now = Date.now();
    const elapsed = now - _startedAt;
    const idle = now - _lastActivity;

    if (elapsed < maxMs && idle < idleMs) {
        return false;
    }

    const newId = _generateUUID();
    _id = newId;
    _startedAt = now;
    _lastActivity = now;
    _writeSession(newId);

    try {
        _channel && _channel.postMessage({type: 'rotate', id: newId});
    } catch (_) {}

    if (typeof onRotateFn === 'function') {
        onRotateFn(newId);
    }

    diag.debug('Session rotated', newId);
    return true;
}

/**
 * Closes the BroadcastChannel, removes activity listeners, and resets module state.
 */
export function closeSession() {
    if (_onActivity) {
        for (const ev of ['click', 'keydown', 'scroll', 'touchstart']) {
            try {
                window.removeEventListener(ev, _onActivity, {
                    capture: true,
                });
            } catch (_) {}
        }
        _onActivity = null;
    }
    if (_channel) {
        try {
            _channel.close();
        } catch (_) {}
        _channel = null;
    }
    _id = null;
    _startedAt = 0;
    _lastActivity = 0;
    _persistSession = false;
}

// -- helper functions

function _writeSession(id) {
    if (_persistSession) {
        _writeCookie(id);
    } else {
        _writeStorage(id);
    }
}

function _readStorage() {
    try {
        return sessionStorage.getItem(SESSION_KEY) || null;
    } catch (_) {
        return null;
    }
}

function _writeStorage(id) {
    try {
        sessionStorage.setItem(SESSION_KEY, id);
    } catch (_) {}
}

function _readCookie() {
    try {
        const match = document.cookie
            .split('; ')
            .find((row) => row.startsWith(SESSION_KEY + '='));
        return match ? decodeURIComponent(match.split('=')[1]) : null;
    } catch (_) {
        return null;
    }
}

function _writeCookie(id) {
    try {
        const maxAge = Math.floor(DEFAULT_IDLE_MS / 1000);
        const secure = location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${SESSION_KEY}=${encodeURIComponent(id)}; max-age=${maxAge}; SameSite=Strict; path=/${secure}`;
    } catch (_) {}
}

function _generateUUID() {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
