/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

const SESSION_KEY = 'elastic.rum.sid';
const CHANNEL_NAME = 'elastic-rum-session';
/** Max while the user keeps interacting (Datadog / Hotjar). */
const DEFAULT_MAX_MS = 4 * 60 * 60 * 1000;
/** Close capture after this much time without click / key / scroll / touch. */
const DEFAULT_IDLE_MS = 30 * 60 * 1000;
const ROTATE_CHECK_THROTTLE_MS = 1000;

let _id = null;
let _startedAt = 0;
let _lastActivity = Date.now();
let _channel = null;
let _persistSession = false;
let _maxMs = DEFAULT_MAX_MS;
let _idleMs = DEFAULT_IDLE_MS;
let _sequence = 1;
let _lastRotateCheck = 0;
let _paused = false;
/** @type {ReturnType<typeof setTimeout> | null} */
let _idleTimer = null;
/** @type {((newId: string) => void) | null} */
let _onRotate = null;
/** @type {(() => void) | null} */
let _onIdle = null;
/** @type {(() => void) | null} */
let _onResume = null;
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
    _maxMs = cfg.maxMs ?? DEFAULT_MAX_MS;
    _idleMs = cfg.idleMs ?? DEFAULT_IDLE_MS;
    _sequence = 1;
    _paused = false;

    const now = Date.now();
    const stored = _readState();
    const cookieId = _persistSession ? _readCookie() : null;
    const candidate = cookieId || stored?.id || null;
    const clocksOk =
        stored &&
        stored.id === candidate &&
        typeof stored.startedAt === 'number' &&
        typeof stored.lastActivity === 'number' &&
        now - stored.lastActivity < _idleMs &&
        now - stored.startedAt < _maxMs;

    if (candidate && clocksOk) {
        _id = candidate;
        _startedAt = stored.startedAt;
        _lastActivity = stored.lastActivity;
    } else {
        _id = _generateUUID();
        _startedAt = now;
        _lastActivity = now;
    }

    _writeSession(_id);
    _armIdleTimer();

    _onActivity = () => {
        const ts = Date.now();
        const needsLifecycle =
            _paused || ts - _lastActivity >= _idleMs || ts - _startedAt >= _maxMs;
        if (needsLifecycle || ts - _lastRotateCheck >= ROTATE_CHECK_THROTTLE_MS) {
            _lastRotateCheck = ts;
            _onUserActivity();
            return;
        }
        _lastActivity = ts;
        _writeSession(_id);
    };
    for (const ev of ['click', 'keydown', 'scroll', 'touchstart']) {
        window.addEventListener(ev, _onActivity, {
            passive: true,
            capture: true,
        });
    }

    try {
        _channel = new BroadcastChannel(CHANNEL_NAME);
        _channel.onmessage = (e) => {
            if (e.data && e.data.type === 'rotate') {
                _id = e.data.id;
                _startedAt = Date.now();
                _lastActivity = Date.now();
                _sequence += 1;
                _paused = false;
                _writeSession(_id);
                _armIdleTimer();
                if (typeof _onResume === 'function') {
                    _onResume();
                }
                if (typeof _onRotate === 'function') {
                    _onRotate(_id);
                }
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

/** Monotonic session generation (1 after init, increments on each rotate). */
export function getSessionSequence() {
    return _sequence;
}

export function isSessionPaused() {
    return _paused;
}

/**
 * Optional callback after this tab rotates (or adopts a rotate from another tab).
 *
 * @param {((newId: string) => void) | null} fn
 */
export function setSessionOnRotate(fn) {
    _onRotate = fn;
}

/**
 * Fired when idle timeout closes capture (no new session id yet).
 *
 * @param {(() => void) | null} fn
 */
export function setSessionOnIdle(fn) {
    _onIdle = fn;
}

/**
 * Fired when user activity resumes capture after idle (id already rotated).
 *
 * @param {(() => void) | null} fn
 */
export function setSessionOnResume(fn) {
    _onResume = fn;
}

/**
 * @returns {{maxMs: number, idleMs: number, persistSession: boolean}}
 */
export function getSessionConfig() {
    return {maxMs: _maxMs, idleMs: _idleMs, persistSession: _persistSession};
}

/**
 * For exporters / replay: pause on idle (do not mint a session), rotate on max.
 *
 * @param {{maxMs?: number, idleMs?: number}} [cfg]
 * @param {(newId: string) => void} [onRotateFn]
 * @returns {boolean} whether rotation occurred
 */
export function checkRotation(cfg = {}, onRotateFn) {
    const maxMs = cfg.maxMs ?? _maxMs;
    const idleMs = cfg.idleMs ?? _idleMs;
    const now = Date.now();
    const elapsed = now - _startedAt;
    const idle = now - _lastActivity;

    if (idle >= idleMs) {
        _enterIdle();
        return false;
    }

    if (elapsed < maxMs) {
        return false;
    }

    _rotate(now);
    if (typeof onRotateFn === 'function') {
        onRotateFn(_id);
    }
    return true;
}

/**
 * Closes the BroadcastChannel, removes activity listeners, and resets module state.
 */
export function closeSession() {
    if (_idleTimer) {
        clearTimeout(_idleTimer);
        _idleTimer = null;
    }
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
    _maxMs = DEFAULT_MAX_MS;
    _idleMs = DEFAULT_IDLE_MS;
    _sequence = 1;
    _lastRotateCheck = 0;
    _paused = false;
    _onRotate = null;
    _onIdle = null;
    _onResume = null;
}

function _onUserActivity() {
    const now = Date.now();
    const wasIdle = _paused || now - _lastActivity >= _idleMs;
    if (wasIdle) {
        _rotate(now);
        _paused = false;
        if (typeof _onResume === 'function') {
            _onResume();
        }
    } else if (now - _startedAt >= _maxMs) {
        _rotate(now);
    }
    _lastActivity = now;
    _writeSession(_id);
    _armIdleTimer();
}

function _enterIdle() {
    if (_paused) {
        return;
    }
    _paused = true;
    if (_idleTimer) {
        clearTimeout(_idleTimer);
        _idleTimer = null;
    }
    if (typeof _onIdle === 'function') {
        _onIdle();
    }
    diag.debug('Session idle — capture paused');
}

function _rotate(now) {
    const newId = _generateUUID();
    _id = newId;
    _startedAt = now;
    _lastActivity = now;
    _sequence += 1;
    _writeSession(newId);
    _armIdleTimer();

    try {
        _channel && _channel.postMessage({type: 'rotate', id: newId});
    } catch (_) {}

    if (typeof _onRotate === 'function') {
        _onRotate(newId);
    }

    diag.debug('Session rotated', newId);
}

function _armIdleTimer() {
    if (_idleTimer) {
        clearTimeout(_idleTimer);
        _idleTimer = null;
    }
    if (_paused || !_id) {
        return;
    }
    const wait = Math.max(0, _idleMs - (Date.now() - _lastActivity));
    _idleTimer = setTimeout(() => {
        _idleTimer = null;
        if (!_id || _paused) {
            return;
        }
        if (Date.now() - _lastActivity < _idleMs) {
            _armIdleTimer();
            return;
        }
        _enterIdle();
    }, wait);
}

function _writeSession(id) {
    if (_persistSession) {
        _writeCookie(id);
    }
    _writeState(id);
}

/**
 * @returns {{id: string, startedAt: number, lastActivity: number} | null}
 */
function _readState() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) {
            return null;
        }
        if (raw.charAt(0) !== '{') {
            // Legacy bare UUID — clocks unknown, do not reuse.
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.id !== 'string' || !parsed.id) {
            return null;
        }
        return {
            id: parsed.id,
            startedAt: parsed.startedAt,
            lastActivity: parsed.lastActivity,
        };
    } catch (_) {
        return null;
    }
}

function _writeState(id) {
    try {
        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
                id,
                startedAt: _startedAt,
                lastActivity: _lastActivity,
            })
        );
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
        const maxAge = Math.floor(_idleMs / 1000);
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
