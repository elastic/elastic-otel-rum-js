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

// rrweb IncrementalSource values that are safe to rate-limit: high-frequency
// interaction noise that carries no DOM/CSS state, so dropping a few frames only
// costs cursor/scroll smoothness. Everything else (mutation, input, stylesheet
// rule, style declaration, canvas, font, adopted stylesheet, media) mutates the
// replayed document and must NEVER be dropped — a single dropped structural or
// style event permanently corrupts every later frame.
const THROTTLEABLE_SOURCES = new Set([
    1, // MouseMove
    2, // MouseInteraction
    3, // Scroll
    4, // ViewportResize
    6, // TouchMove
    12, // Drag
    14, // Selection
]);

// Persist the replay event sequence next to the session id. Each full page
// navigation reloads this module with a fresh JS context, so an in-memory
// counter would restart at 0 on every page and `rr-web.event` would no longer
// be unique/monotonic within a session — collapsing the reassembled stream onto
// the first page's snapshot. sessionStorage shares the session's lifetime
// (per-tab, survives reloads), so the sequence continues across navigations.
const SEQ_KEY = 'elastic.rum.replay.seq';

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
/** @type {Array<ReturnType<typeof setTimeout>>} */
let _settleTimers = [];
/** @type {(() => void) | null} */
let _settleLoadHandler = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let _settleQuietTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let _settleMaxTimer = null;
let _settleQuietMs = 0;
let _settleDone = false;
let _settleSawChange = false;
/** @type {{record: Function & {takeFullSnapshot?: Function}, takeFullSnapshot?: Function} | null} */
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

    // Resume the session-wide sequence (0 for a fresh/rotated session).
    _eventCounter = _loadSeq(_getSessionId?.() ?? '');

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

    if (qualityCfg.settleSnapshot ?? true) {
        const fixedDelays =
            qualityCfg.settleSnapshotDelaysMs ??
            qualityCfg.settleSnapshotDelayMs;
        if (fixedDelays != null) {
            // Escape hatch: explicit, app-tuned snapshot offsets.
            _scheduleSettleSnapshot(
                Array.isArray(fixedDelays) ? fixedDelays : [fixedDelays]
            );
        } else {
            // Default: adaptive. Snapshot once the DOM stops changing.
            _armSettleWatcher(
                qualityCfg.settleQuietMs ?? 500,
                qualityCfg.settleMaxWaitMs ?? 5000
            );
        }
    }

    diag.debug('Replay started, live=', _live);

    if (_live) {
        try {
            const packEvents = _cfg?.quality?.packEvents ?? false;
            const eventIdx = _nextSeq();
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
                    'rr-web.event': eventIdx,
                    'rr-web.offset': eventIdx,
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
    for (const timer of _settleTimers) {
        clearTimeout(timer);
    }
    _settleTimers = [];
    if (_settleQuietTimer) {
        clearTimeout(_settleQuietTimer);
        _settleQuietTimer = null;
    }
    if (_settleMaxTimer) {
        clearTimeout(_settleMaxTimer);
        _settleMaxTimer = null;
    }
    _settleQuietMs = 0;
    _settleDone = false;
    _settleSawChange = false;
    if (_settleLoadHandler) {
        window.removeEventListener('load', _settleLoadHandler);
        _settleLoadHandler = null;
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

/**
 * Re-snapshot once the DOM stops changing after load (framework-agnostic).
 *
 * rrweb only inlines the CSS present at snapshot time. Many sites inject styles
 * via CSSOM (`insertRule`, CSS-in-JS) as components render — after the initial
 * snapshot — and rrweb's incremental style observers can miss rules whose owner
 * `<style>` isn't yet in the mirror, leaving replayed content unstyled. Taking a
 * fresh full snapshot once the page goes quiet re-serialises the DOM and
 * re-reads every stylesheet's `cssRules`, capturing the fully-rendered page.
 *
 * Adaptive by design: the snapshot fires a short "quiet" window after the last
 * DOM mutation (so async/staged pages are captured once their content lands) and
 * is capped by a max wait; it is skipped entirely if nothing changed after load.
 *
 * @param {number} quietMs quiet window after the last mutation
 * @param {number} maxWaitMs upper bound measured from page load
 */
function _armSettleWatcher(quietMs, maxWaitMs) {
    _settleQuietMs = quietMs;
    const start = () => {
        _bumpSettleQuiet();
        _settleMaxTimer = setTimeout(() => _fireSettle(), maxWaitMs);
    };
    if (document.readyState === 'complete') {
        start();
        return;
    }
    _settleLoadHandler = () => start();
    window.addEventListener('load', _settleLoadHandler, {once: true});
}

/** (Re)arm the quiet-window timer; called on each visually-relevant change. */
function _bumpSettleQuiet() {
    if (_settleDone || !_settleQuietMs) {
        return;
    }
    if (_settleQuietTimer) {
        clearTimeout(_settleQuietTimer);
    }
    _settleQuietTimer = setTimeout(() => _fireSettle(), _settleQuietMs);
}

function _fireSettle() {
    if (_settleDone) {
        return;
    }
    _settleDone = true;
    if (_settleQuietTimer) {
        clearTimeout(_settleQuietTimer);
        _settleQuietTimer = null;
    }
    if (_settleMaxTimer) {
        clearTimeout(_settleMaxTimer);
        _settleMaxTimer = null;
    }
    // Nothing rendered after the initial snapshot — it already covers the page.
    if (!_settleSawChange) {
        return;
    }
    const idle =
        typeof requestIdleCallback === 'function'
            ? requestIdleCallback
            : (fn) => setTimeout(fn, 0);
    idle(() => {
        if (_active) {
            _takeFullSnapshot();
        }
    });
}

/**
 * Escape hatch: take full snapshots at explicit offsets from page load.
 *
 * @param {number[]} delaysMs snapshot offsets (ms) measured from page load
 */
function _scheduleSettleSnapshot(delaysMs) {
    const runAfterIdle = () => {
        // Debounce past the burst of mutations that follow first paint, then
        // wait for idle so we don't contend with the app's own rendering.
        const idle =
            typeof requestIdleCallback === 'function'
                ? requestIdleCallback
                : (fn) => setTimeout(fn, 0);
        for (const delayMs of delaysMs) {
            const timer = setTimeout(() => {
                idle(() => {
                    if (_active) {
                        _takeFullSnapshot();
                    }
                });
            }, delayMs);
            _settleTimers.push(timer);
        }
    };

    if (document.readyState === 'complete') {
        runAfterIdle();
        return;
    }
    _settleLoadHandler = () => runAfterIdle();
    window.addEventListener('load', _settleLoadHandler, {once: true});
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
    // Track DOM/CSS activity so the adaptive settle snapshot can fire once the
    // page goes quiet (source 0 = mutation, 8 = stylesheet rule insert/delete).
    if (
        !_settleDone &&
        _settleQuietMs &&
        event.type === 3 &&
        (event.data?.source === 0 || event.data?.source === 8)
    ) {
        _settleSawChange = true;
        _bumpSettleQuiet();
    }

    // Only throttle interaction noise; never drop structural/style events.
    if (event.type === 3 && THROTTLEABLE_SOURCES.has(event.data?.source)) {
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

/**
 * Next monotonic, session-unique event index. Persisted so it survives full
 * page navigations within the session (see SEQ_KEY).
 *
 * @returns {number}
 */
function _nextSeq() {
    _eventCounter++;
    _saveSeq(_getSessionId?.() ?? '', _eventCounter);
    return _eventCounter;
}

/**
 * @param {string} sessionId
 * @returns {number} stored sequence for this session, or 0 if none/rotated
 */
function _loadSeq(sessionId) {
    try {
        const raw = sessionStorage.getItem(SEQ_KEY);
        if (!raw) {
            return 0;
        }
        const parsed = JSON.parse(raw);
        if (parsed && parsed.sid === sessionId && Number.isFinite(parsed.n)) {
            return parsed.n;
        }
    } catch (_) {}
    return 0;
}

/**
 * @param {string} sessionId
 * @param {number} n
 */
function _saveSeq(sessionId, n) {
    try {
        sessionStorage.setItem(SEQ_KEY, JSON.stringify({sid: sessionId, n}));
    } catch (_) {}
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

    const eventIdx = _nextSeq();

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
