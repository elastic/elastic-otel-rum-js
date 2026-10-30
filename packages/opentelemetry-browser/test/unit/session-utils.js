/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag, DiagLogLevel} from '@opentelemetry/api';

import {SessionManager} from '../../lib/session/manager.js';

export const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class MemoryStorage {
    constructor() {
        /** @type {Map<string, string>} */
        this.map = new Map();
        this.failWrites = false;
    }
    get length() {
        return this.map.size;
    }
    clear() {
        this.map.clear();
    }
    /** @param {number} i */
    key(i) {
        return [...this.map.keys()][i] ?? null;
    }
    /** @param {string} k */
    getItem(k) {
        return this.map.get(k) ?? null;
    }
    /** @param {string} k @param {string} v */
    setItem(k, v) {
        if (this.failWrites) {
            throw new Error('QuotaExceededError');
        }
        this.map.set(k, v);
    }
    /** @param {string} k */
    removeItem(k) {
        this.map.delete(k);
    }
}

/**
 * @param {Partial<import('../../lib/session/manager.js').SessionManagerOptions>} [opts]
 */
export function setup(opts = {}) {
    const clock = {now: 1_000_000};
    /** @type {import('../../lib/session/state.js').SessionInfo[]} */
    const started = [];
    const sessionStorage = new MemoryStorage();
    const tabStorage = new MemoryStorage();
    /** @type {{fn: () => void, at: number, cleared: boolean}[]} */
    const pending = [];
    const timers = {
        /** @param {() => void} fn @param {number} ms */
        setTimeout(fn, ms) {
            const timer = {fn, at: clock.now + ms, cleared: false};
            pending.push(timer);
            return timer;
        },
        /** @param {{cleared: boolean}} timer */
        clearTimeout(timer) {
            timer.cleared = true;
        },
    };
    /** Moves the clock and runs the timers that became due. */
    const advance = (/** @type {number} */ ms) => {
        const target = clock.now + ms;
        for (;;) {
            const due = pending
                .filter((t) => !t.cleared && t.at <= target)
                .sort((a, b) => a.at - b.at)[0];
            if (!due) {
                break;
            }
            due.cleared = true;
            clock.now = Math.max(clock.now, due.at);
            due.fn();
        }
        clock.now = target;
    };
    const activeTimers = () => pending.filter((t) => !t.cleared);
    const create = (/** @type {MemoryStorage} */ tab = tabStorage) => {
        const manager = new SessionManager({
            sessionStorage,
            tabStorage: tab,
            inactivityTimeout: 60,
            maxDuration: 600,
            now: () => clock.now,
            timers,
            ...opts,
        });
        // What the SDK does to report `session.start` once
        manager.addObserver({
            onSessionStarted: (s) => {
                if (manager.isCreatedHere(s.id)) {
                    started.push(s);
                }
            },
        });
        return manager;
    };
    /** Like production, where `start()` runs right after creation. */
    const createStarted = (/** @type {MemoryStorage} */ tab = tabStorage) => {
        const manager = create(tab);
        manager.start();
        return manager;
    };
    return {
        clock,
        started,
        sessionStorage,
        tabStorage,
        create,
        createStarted,
        advance,
        activeTimers,
    };
}

/**
 * Records observer calls as `started:<id>` / `ended:<id>` strings.
 * @param {SessionManager} manager
 */
export function observe(manager) {
    /** @type {string[]} */
    const calls = [];
    /** @type {(import('../../lib/session/state.js').SessionInfo | undefined)[]} */
    const previous = [];
    const unsubscribe = manager.addObserver({
        onSessionStarted: (s, p) => {
            calls.push(`started:${s.id}`);
            previous.push(p);
        },
        onSessionEnded: (s) => calls.push(`ended:${s.id}`),
    });
    return {calls, previous, unsubscribe};
}

/**
 * @param {() => void} fn
 * @returns {string[]} warnings emitted by `fn`
 */
export function captureWarnings(fn) {
    /** @type {string[]} */
    const warnings = [];
    diag.setLogger(
        {
            warn: (msg) => warnings.push(msg),
            error() {},
            info() {},
            debug() {},
            verbose() {},
        },
        {logLevel: DiagLogLevel.WARN, suppressOverrideMessage: true}
    );
    try {
        fn();
    } finally {
        diag.disable();
    }
    return warnings;
}
