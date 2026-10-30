/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {SessionObservers} from '../../lib/session/observers.js';

/**
 * @param {string} id
 * @param {string} [previousId]
 * @returns {import('../../lib/session/state.js').SessionState}
 */
const session = (id, previousId) => ({
    id,
    previousId,
    startTimestamp: 1,
    lastActivityTimestamp: 1,
    sampled: true,
    samplingRate: 1,
});

/** @param {SessionObservers} observers */
function record(observers, name = '') {
    /** @type {string[]} */
    const calls = [];
    const unsubscribe = observers.add({
        onSessionStarted: (s, p) =>
            calls.push(`${name}started:${s.id}<-${p?.id ?? '-'}`),
        onSessionEnded: (s) => calls.push(`${name}ended:${s.id}`),
    });
    return {calls, unsubscribe};
}

test('SessionObservers - reports the end before the start, with the real previous session', () => {
    const observers = new SessionObservers();
    const {calls} = record(observers);
    observers.publish(undefined, session('a'));
    observers.publish(session('a'), session('b', 'a'));
    // Missed sessions in between are not reported as previous
    observers.publish(session('b', 'a'), session('d', 'c'));
    assert.deepStrictEqual(calls, [
        'started:a<--',
        'ended:a',
        'started:b<-a',
        'ended:b',
        'started:d<--',
    ]);
});

test('SessionObservers - calls observers in registration order and unsubscribes', () => {
    const observers = new SessionObservers();
    const calls = [];
    const observer = {
        onSessionStarted: (
            /** @type {import('../../lib/session/state.js').SessionInfo} */ s
        ) => calls.push(s.id),
    };
    const first = observers.add(observer);
    observers.add(observer);
    const other = record(observers, 'other:');
    observers.publish(undefined, session('a'));
    assert.deepStrictEqual(calls, ['a', 'a']);
    assert.deepStrictEqual(other.calls, ['other:started:a<--']);

    // The same observer added twice is unsubscribed separately
    first();
    observers.publish(session('a'), session('b'));
    assert.deepStrictEqual(calls, ['a', 'a', 'b']);

    observers.clear();
    observers.publish(session('b'), session('c'));
    assert.deepStrictEqual(calls, ['a', 'a', 'b']);
    assert.strictEqual(other.calls.length, 3);
});

test('SessionObservers - delivers changes published from a callback after the current ones', () => {
    const observers = new SessionObservers();
    const {calls} = record(observers, 'first:');
    observers.add({
        onSessionEnded: (s) => {
            if (s.id === 'a') {
                observers.publish(session('b', 'a'), session('c', 'b'));
            }
        },
    });
    const {calls: last} = record(observers, 'last:');
    observers.publish(undefined, session('a'));
    observers.publish(session('a'), session('b', 'a'));
    assert.deepStrictEqual(calls, [
        'first:started:a<--',
        'first:ended:a',
        'first:started:b<--',
        'first:ended:b',
        'first:started:c<-b',
    ]);
    assert.deepStrictEqual(last, [
        'last:started:a<--',
        'last:ended:a',
        'last:started:b<--',
        'last:ended:b',
        'last:started:c<-b',
    ]);
});

test('SessionObservers - passes copies without internal state', () => {
    const observers = new SessionObservers();
    /** @type {unknown[]} */
    const seen = [];
    observers.add({onSessionStarted: (s) => seen.push(s)});
    observers.publish(undefined, session('a'));
    assert.deepStrictEqual(seen, [
        {id: 'a', previousId: undefined, startTimestamp: 1, sampled: true},
    ]);
});
