/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {
    createSession,
    ExpiryTimer,
    getExpiryTime,
    isExpired,
} from '../../lib/session/lifecycle.js';
import {SessionSampler} from '../../lib/session/sampler.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const limits = {inactivityMs: 30 * MINUTE, maxDurationMs: 4 * HOUR};

/**
 * @param {number} startTimestamp
 * @param {number} [lastActivityTimestamp]
 * @returns {import('../../lib/session/state.js').SessionState}
 */
const session = (startTimestamp, lastActivityTimestamp = startTimestamp) => ({
    id: 'a',
    startTimestamp,
    lastActivityTimestamp,
    sampled: true,
    samplingRate: 1,
});

test('createSession - starts now with the sampler decision and rate', () => {
    assert.deepStrictEqual(
        createSession('b', 1000, undefined, new SessionSampler(0)),
        {
            id: 'b',
            previousId: undefined,
            startTimestamp: 1000,
            lastActivityTimestamp: 1000,
            sampled: false,
            samplingRate: 0,
        }
    );
});

test('createSession - links the previous session for up to 24 hours', () => {
    const sampler = new SessionSampler(1);
    const now = 48 * HOUR;
    const recent = session(now - 24 * HOUR + 1);
    const old = session(now - 24 * HOUR);
    assert.strictEqual(
        createSession('b', now, recent, sampler).previousId,
        'a'
    );
    assert.strictEqual(
        createSession('b', now, old, sampler).previousId,
        undefined
    );
});

test('isExpired - ends exactly at the inactivity timeout', () => {
    const s = session(0, HOUR);
    assert.strictEqual(isExpired(s, HOUR + 30 * MINUTE - 1, limits), false);
    assert.strictEqual(isExpired(s, HOUR + 30 * MINUTE, limits), true);
});

test('isExpired - ends exactly at the max duration despite activity', () => {
    const s = session(0, 4 * HOUR - 1);
    assert.strictEqual(isExpired(s, 4 * HOUR - 1, limits), false);
    assert.strictEqual(isExpired(s, 4 * HOUR, limits), true);
});

test('isExpired - tolerates up to 5 minutes of clock skew', () => {
    const now = HOUR;
    assert.strictEqual(
        isExpired(session(now + 5 * MINUTE), now, limits),
        false
    );
    assert.strictEqual(
        isExpired(session(now + 5 * MINUTE + 1), now, limits),
        true
    );
    assert.strictEqual(
        isExpired(session(now, now + 5 * MINUTE + 1), now, limits),
        true
    );
});

test('isExpired - an ended session is expired right away', () => {
    assert.strictEqual(
        isExpired({...session(0), ended: true}, 0, limits),
        true
    );
});

test('getExpiryTime - returns the earliest of both limits', () => {
    assert.strictEqual(getExpiryTime(session(0, HOUR), limits), 90 * MINUTE);
    assert.strictEqual(
        getExpiryTime(session(0, 4 * HOUR - MINUTE), limits),
        4 * HOUR
    );
});

/** @param {number} now */
function fakeTimers(now) {
    /** @type {{fn: () => void, ms: number, cleared: boolean}[]} */
    const timers = [];
    return {
        timers,
        setTimeout(/** @type {() => void} */ fn, /** @type {number} */ ms) {
            const timer = {fn, ms, cleared: false};
            timers.push(timer);
            return timer;
        },
        clearTimeout(/** @type {{cleared: boolean}} */ timer) {
            timer.cleared = true;
        },
        now: () => now,
    };
}

test('ExpiryTimer - waits until the expiry time', () => {
    const fake = fakeTimers(1000);
    const timer = new ExpiryTimer(fake.now, fake);
    let fired = 0;
    timer.schedule(5000, () => fired++);
    assert.strictEqual(timer.expiresAt, 5000);
    assert.strictEqual(fake.timers[0].ms, 4000);
    fake.timers[0].fn();
    assert.strictEqual(fired, 1);
});

test('ExpiryTimer - clamps delays to what browsers support', () => {
    const fake = fakeTimers(1000);
    const timer = new ExpiryTimer(fake.now, fake);
    timer.schedule(0, () => {});
    timer.schedule(Number.MAX_SAFE_INTEGER, () => {});
    assert.deepStrictEqual(
        fake.timers.map((t) => t.ms),
        [0, 2 ** 31 - 1]
    );
});

test('ExpiryTimer - keeps a single pending timer', () => {
    const fake = fakeTimers(0);
    const timer = new ExpiryTimer(fake.now, fake);
    timer.schedule(1000, () => {});
    timer.schedule(2000, () => {});
    assert.deepStrictEqual(
        fake.timers.map((t) => t.cleared),
        [true, false]
    );
    assert.strictEqual(timer.expiresAt, 2000);
});

test('ExpiryTimer - clear cancels the timer and resets the expiry time', () => {
    const fake = fakeTimers(0);
    const timer = new ExpiryTimer(fake.now, fake);
    timer.schedule(1000, () => {});
    timer.clear();
    assert.strictEqual(fake.timers[0].cleared, true);
    assert.strictEqual(timer.expiresAt, 0);
    // Once fired there is nothing left to cancel
    timer.schedule(1000, () => {});
    fake.timers[1].fn();
    timer.clear();
    assert.strictEqual(fake.timers[1].cleared, false);
});
