/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {
    DEFAULT_ACTIVITY_EVENTS,
    resolveActivityEvents,
    trackUserActivity,
} from '../../lib/session/activity.js';
import {captureWarnings} from './session-utils.js';

test('resolveActivityEvents - uses defaults when not set', () => {
    assert.deepStrictEqual(resolveActivityEvents({}), DEFAULT_ACTIVITY_EVENTS);
});

test('resolveActivityEvents - keeps a valid list', () => {
    assert.deepStrictEqual(
        resolveActivityEvents({activityEvents: ['click', 'keyup']}),
        ['click', 'keyup']
    );
});

test('resolveActivityEvents - falls back to defaults on invalid values', () => {
    for (const value of [[], 'click', [1], ['click', ''], null]) {
        assert.deepStrictEqual(
            // @ts-expect-error - testing invalid input
            resolveActivityEvents({activityEvents: value}),
            DEFAULT_ACTIVITY_EVENTS,
            `value: ${JSON.stringify(value)}`
        );
    }
});

/**
 * Minimal window and document stubs. Node events are never trusted, so
 * tests inject the trust check.
 * @param {import('node:test').TestContext} t
 * @param {{visibilityState?: string}} [docState]
 */
function stubBrowser(t, docState = {}) {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), {
        visibilityState: 'visible',
        ...docState,
    });
    // @ts-expect-error - minimal stubs
    globalThis.window = win;
    // @ts-expect-error - minimal stubs
    globalThis.document = doc;
    t.after(() => {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
    });
    return {win, doc};
}

const recorder = () => {
    /** @type {Array<{renew?: boolean} | undefined>} */
    const calls = [];
    return {
        calls,
        manager: {
            /** @param {{renew?: boolean}} [opts] */
            recordActivity: (opts) => {
                calls.push(opts);
            },
        },
    };
};

test('trackUserActivity - records activity on window events until stopped', (t) => {
    const {win} = stubBrowser(t);
    const {calls, manager} = recorder();
    const stop = trackUserActivity(manager, ['keydown', 'scroll'], () => true);

    win.dispatchEvent(new Event('keydown'));
    win.dispatchEvent(new Event('scroll'));
    win.dispatchEvent(new Event('click'));
    assert.strictEqual(calls.length, 2);

    stop();
    win.dispatchEvent(new Event('keydown'));
    assert.strictEqual(calls.length, 2);
});

test('trackUserActivity - ignores untrusted events', (t) => {
    const {win} = stubBrowser(t);
    const {calls, manager} = recorder();
    trackUserActivity(manager, ['keydown'], () => false);

    win.dispatchEvent(new Event('keydown'));
    assert.strictEqual(calls.length, 0);
});

test('trackUserActivity - treats a visible tab as presence that does not renew', (t) => {
    const {doc} = stubBrowser(t);
    const {calls, manager} = recorder();
    const stop = trackUserActivity(manager, ['keydown'], () => true);

    doc.dispatchEvent(new Event('visibilitychange'));
    assert.deepStrictEqual(calls, [{renew: false}]);

    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    assert.strictEqual(calls.length, 1);

    stop();
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    assert.strictEqual(calls.length, 1);
});

test('trackUserActivity - is a no-op without a window', (t) => {
    const original = globalThis.window;
    // @ts-expect-error - simulate a non browser environment
    delete globalThis.window;
    t.after(() => {
        globalThis.window = original;
    });
    const stop = trackUserActivity({recordActivity() {}}, ['keydown']);
    assert.doesNotThrow(() => stop());
});

test('resolveActivityEvents - accepts known events without warning', () => {
    const warnings = captureWarnings(() => {
        assert.deepStrictEqual(
            resolveActivityEvents({
                activityEvents: ['click', 'touchstart', 'pointermove', 'input'],
            }),
            ['click', 'touchstart', 'pointermove', 'input']
        );
        resolveActivityEvents({});
    });
    assert.deepStrictEqual(warnings, []);
});

test('resolveActivityEvents - warns about likely typos but keeps the events', () => {
    /** @type {string[]} */
    let events = [];
    const warnings = captureWarnings(() => {
        events = resolveActivityEvents({
            activityEvents: ['keyDown', 'pointerdwon', 'click'],
        });
    });
    assert.deepStrictEqual(events, ['keyDown', 'pointerdwon', 'click']);
    assert.strictEqual(warnings.length, 2);
    assert.match(warnings[0], /keyDown/);
    assert.match(warnings[1], /pointerdwon/);
});
