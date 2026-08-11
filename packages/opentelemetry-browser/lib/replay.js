/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';
import {SeverityNumber} from '@opentelemetry/api-logs';

const BUCKET_CAPACITY = 100;
const BUCKET_REFILL_RATE = 10; // tokens/sec
const MAX_BUFFER_EVENTS = 200;
const MAX_BUFFER_BYTES = 5 * 1024 * 1024;

/** @type {Map<number, {tokens: number, lastRefill: number}>} */
let _buckets = new Map();
let _refillTimer = null;

let _live = false;
/** @type {any[]} */
let _buffer = [];
/** @type {(() => void) | null} */
let _stopFn = null;
/** @type {import('@opentelemetry/api-logs').Logger | null} */
let _replayLogger = null;
/** @type {any} */
let _cfg = null;
/** @type {(() => string | null) | null} */
let _getSessionId = null;
/** @type {((cfg?: any, fn?: Function) => boolean) | null} */
let _checkRotation = null;
let _active = false;
let _eventCounter = 0;
/** @type {(() => void) | null} */
let _visibilityHandler = null;
/** @type {(() => void) | null} */
let _onError = null;
/** @type {{record: Function, takeFullSnapshot?: Function} | null} */
let _rrweb = null;
/** @type {Promise<void> | null} */
let _startPromise = null;

/**
 * Starts rrweb recording (loads `@rrweb/record` dynamically).
 *
 * @param {{
 *   samplingRate?: number,
 *   errorSamplingRate?: number,
 *   replayLogger: import('@opentelemetry/api-logs').Logger,
 *   getSessionId: () => string | null,
 *   checkRotation: (cfg?: any, fn?: Function) => boolean,
 *   privacy?: object,
 *   quality?: object,
 * }} cfg
 * @returns {Promise<void>}
 */
export function startReplay(cfg) {
    if (_active || _startPromise) {
        return _startPromise ?? Promise.resolve();
    }

    _startPromise = _startReplayAsync(cfg).finally(() => {
        _startPromise = null;
    });
    return _startPromise;
}

/**
 * @param {any} cfg
 * @returns {Promise<void>}
 */
async function _startReplayAsync(cfg) {
    _cfg = cfg;
    _replayLogger = cfg.replayLogger;
    _getSessionId = cfg.getSessionId;
    _checkRotation = cfg.checkRotation;

    _live = Math.random() * 100 < (cfg.samplingRate ?? 100);

    if (!_live && (cfg.errorSamplingRate ?? 0) > 0) {
        _onError = () => _activateFromError();
        window.addEventListener('error', _onError);
        window.addEventListener('unhandledrejection', _onError);
    }

    _refillTimer = setInterval(_refillBuckets, 1000);

    let recordFn;
    try {
        const mod = await import('@rrweb/record');
        recordFn = mod.record;
        _rrweb = mod;
    } catch (err) {
        diag.warn('Replay: failed to load @rrweb/record', err);
        _cleanupPartialStart();
        return;
    }

    const privacyCfg = cfg.privacy ?? {};
    const qualityCfg = cfg.quality ?? {};

    try {
        _stopFn = recordFn({
            emit: _onEvent,
            maskAllInputs: privacyCfg.maskAllInputs ?? true,
            maskTextSelector: privacyCfg.maskAllText
                ? '*'
                : privacyCfg.maskTextSelector,
            blockSelector: privacyCfg.blockSelector,
            blockClass: privacyCfg.blockClass ?? 'rum-block',
            ignoreClass: privacyCfg.ignoreClass ?? 'rum-ignore',
            maskInputOptions: privacyCfg.maskInputOptions,
            maskInputFn: privacyCfg.maskInputFn,
            inlineStylesheet: qualityCfg.inlineStylesheet ?? true,
            collectFonts: qualityCfg.collectFonts ?? false,
            slimDOMOptions: qualityCfg.slimDOM ?? true,
            recordCanvas: qualityCfg.recordCanvas ?? false,
            sampling: {
                mousemove: 50,
                scroll: 150,
                input: 'last',
                canvas: 2,
            },
            checkoutEveryNms: 5 * 60 * 1000,
            errorHandler: (err) => {
                diag.warn('Replay: rrweb internal error:', err);
                return true;
            },
        });
        if (typeof _stopFn !== 'function') {
            diag.warn(
                'Replay: record() returned non-function — snapshot likely failed'
            );
        }
    } catch (err) {
        diag.warn('Replay: record() threw:', err);
        _cleanupPartialStart();
        return;
    }

    _active = true;

    _visibilityHandler = () => {
        if (!document.hidden && _live) {
            _takeFullSnapshot();
        }
    };
    document.addEventListener('visibilitychange', _visibilityHandler);

    diag.debug('Replay started, live=', _live);

    if (_live) {
        try {
            const packEvents = _cfg?.quality?.packEvents ?? false;
            _replayLogger.emit({
                body: JSON.stringify({
                    type: 99,
                    timestamp: Date.now(),
                    data: {name: 'replay-started'},
                }),
                attributes: {
                    'elastic.rum.log.type': 'replay',
                    'rrweb.type': 99,
                    'rrweb.packed': packEvents ? 1 : 0,
                    'rr-web.event': 0,
                    'rr-web.chunk': 1,
                    'rr-web.total-chunks': 1,
                    'session.id': _getSessionId?.() ?? '',
                    'rum.sessionId': _getSessionId?.() ?? '',
                },
            });
        } catch (_) {}
    }
}

export function pauseReplay() {
    _live = false;
}

export function resumeReplay() {
    _live = true;
    _takeFullSnapshot();
}

export function stopReplay() {
    if (_stopFn) {
        try {
            _stopFn();
        } catch (_) {}
        _stopFn = null;
    }
    _cleanupPartialStart();
    _buckets.clear();
    _buffer = [];
    _active = false;
    _rrweb = null;
    _eventCounter = 0;
    _live = false;
    _cfg = null;
    _replayLogger = null;
    _getSessionId = null;
    _checkRotation = null;
}

function _cleanupPartialStart() {
    if (_refillTimer) {
        clearInterval(_refillTimer);
        _refillTimer = null;
    }
    if (_visibilityHandler) {
        document.removeEventListener('visibilitychange', _visibilityHandler);
        _visibilityHandler = null;
    }
    if (_onError) {
        window.removeEventListener('error', _onError);
        window.removeEventListener('unhandledrejection', _onError);
        _onError = null;
    }
}

function _takeFullSnapshot() {
    try {
        const take =
            _rrweb?.record?.takeFullSnapshot ?? _rrweb?.takeFullSnapshot;
        if (typeof take === 'function') {
            take.call(_rrweb?.record ?? _rrweb);
        }
    } catch (err) {
        diag.debug('Replay: takeFullSnapshot failed', err);
    }
}

function _activateFromError() {
    if (_live) {
        return;
    }
    if (_onError) {
        window.removeEventListener('error', _onError);
        window.removeEventListener('unhandledrejection', _onError);
        _onError = null;
    }
    for (const evt of _buffer) {
        _emitRecord(evt);
    }
    _buffer = [];
    _live = true;
    diag.debug('Replay: activated from error sampling');
}

function _onEvent(event) {
    if (event.type === 3) {
        const nodeId = event.data?.id ?? 0;
        if (!_consumeToken(nodeId)) {
            return;
        }
    }

    if (!_live) {
        _buffer.push(event);
        if (_buffer.length > MAX_BUFFER_EVENTS) {
            _buffer.shift();
        }
        let bufBytes = 0;
        for (const e of _buffer) {
            try {
                bufBytes += JSON.stringify(e).length;
            } catch (_) {}
        }
        while (_buffer.length > 1 && bufBytes > MAX_BUFFER_BYTES) {
            const removed = _buffer.shift();
            try {
                bufBytes -= JSON.stringify(removed).length;
            } catch (_) {}
        }
        return;
    }

    _checkRotation?.({maxMs: 840_000, idleMs: 1_800_000}, (newId) => {
        diag.debug('Session rotated during replay', newId);
    });

    _emitRecord(event);
}

function _emitRecord(event) {
    if (!_replayLogger) {
        return;
    }
    const sessionId = _getSessionId?.() ?? '';
    const packEvents = _cfg?.quality?.packEvents ?? false;

    let body;
    try {
        body = JSON.stringify(event);
    } catch (err) {
        diag.warn('replay: serialise error', err);
        return;
    }

    const eventIdx = ++_eventCounter;

    try {
        _replayLogger.emit({
            body,
            severityNumber: SeverityNumber.UNSPECIFIED,
            attributes: {
                'session.id': sessionId,
                'rum.sessionId': sessionId,
                'rr-web.event': eventIdx,
                'rr-web.offset': eventIdx,
                'rr-web.chunk': 1,
                'rr-web.total-chunks': 1,
                'rrweb.type': event.type ?? 0,
                'rrweb.packed': packEvents ? 1 : 0,
                'page.url': window.location.href,
                'page.url.path': window.location.pathname,
                'elastic.rum.log.type': 'replay',
            },
        });
    } catch (err) {
        diag.warn('replay: emit error', err);
    }
}

function _consumeToken(nodeId) {
    const now = Date.now();
    let bucket = _buckets.get(nodeId);
    if (!bucket) {
        bucket = {tokens: BUCKET_CAPACITY, lastRefill: now};
        _buckets.set(nodeId, bucket);
    }
    if (bucket.tokens > 0) {
        bucket.tokens--;
        return true;
    }
    return false;
}

function _refillBuckets() {
    for (const bucket of _buckets.values()) {
        bucket.tokens = Math.min(
            BUCKET_CAPACITY,
            bucket.tokens + BUCKET_REFILL_RATE
        );
    }
    if (_buckets.size > 500) {
        const keys = [..._buckets.keys()];
        for (const k of keys.slice(0, _buckets.size - 500)) {
            _buckets.delete(k);
        }
    }
}
