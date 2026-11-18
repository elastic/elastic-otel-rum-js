/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {afterEach, beforeEach, mock, test} from 'node:test';

import {
    CLICK_CHAIN_WINDOW_MS,
    ClickChainDetector,
    MAX_ERROR_WINDOW_MS,
} from '../../lib/frustration/detector.js';

const RAGE = 'browser.frustration.rage_click';
const DEAD = 'browser.frustration.dead_click';
const ERROR = 'browser.frustration.error_click';

beforeEach(() => {
    mock.timers.enable({apis: ['setTimeout', 'Date'], now: 1_000_000});
    globalThis.location = /** @type {any} */ ({href: 'https://example.com/'});
});
afterEach(() => {
    mock.timers.reset();
    delete (/** @type {any} */ (globalThis).location);
});

function setup() {
    /** @type {Array<{eventName: string, attributes: any, timestamp: number}>} */
    const emitted = [];
    const hooks = {watch: 0, unwatch: 0};
    const detector = new ClickChainDetector(
        (eventName, attributes, timestamp) =>
            emitted.push({eventName, attributes, timestamp}),
        {watch: () => hooks.watch++, unwatch: () => hooks.unwatch++}
    );
    const button = {};
    /** @param {Partial<import('../../lib/frustration/detector.js').Click>} [opts] */
    const click = (opts = {}) =>
        detector.click({
            target: button,
            canBeDead: true,
            selectsText: false,
            attributes: {'browser.css_selector': '#buy'},
            ...opts,
        });
    const names = () => emitted.map((e) => e.eventName);
    return {detector, click, emitted, names, hooks};
}

/** @param {number} ms */
const tick = (ms) => mock.timers.tick(ms);

test('a click the page reacts to is not reported', () => {
    const {detector, click, emitted} = setup();
    click();
    detector.activity();
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(emitted, []);
});

test('a click with no reaction is a dead click, reported when the chain ends', () => {
    const {click, emitted} = setup();
    const start = Date.now();
    click();
    tick(CLICK_CHAIN_WINDOW_MS - 1);
    assert.equal(emitted.length, 0);
    tick(1);
    assert.deepEqual(emitted, [
        {
            eventName: DEAD,
            attributes: {'browser.css_selector': '#buy'},
            timestamp: start,
        },
    ]);
});

test('clicks on elements that do not look clickable are never dead', () => {
    const {click, emitted} = setup();
    click({canBeDead: false});
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(emitted, []);
});

test('a click that changes the URL is not dead', () => {
    const {click, emitted} = setup();
    click();
    globalThis.location.href = 'https://example.com/cart';
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(emitted, []);
});

test('3 clicks within 1s are one rage click with the click count', () => {
    const {detector, click, emitted} = setup();
    const start = Date.now();
    for (let i = 0; i < 5; i++) {
        click();
        detector.activity();
        tick(200);
    }
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(emitted, [
        {
            eventName: RAGE,
            attributes: {
                'browser.css_selector': '#buy',
                'browser.frustration.click_count': 5,
            },
            timestamp: start,
        },
    ]);
});

test('2 clicks, or 3 spread over more than 1s, are not rage', () => {
    const {detector, click, names} = setup();
    click();
    click();
    detector.activity();
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(names(), []);

    for (let i = 0; i < 3; i++) {
        click();
        detector.activity();
        tick(600);
    }
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(names(), []);
});

test('a long chain is rage once 3 of its clicks fall within 1s', () => {
    const {detector, click, emitted} = setup();
    for (let i = 0; i < 10; i++) {
        click();
        detector.activity();
        tick(600);
    }
    click();
    tick(100);
    click();
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(
        emitted.map((e) => [
            e.eventName,
            e.attributes['browser.frustration.click_count'],
        ]),
        [[RAGE, 12]]
    );
});

test('clicks on different targets are not rage', () => {
    const {detector, click, names} = setup();
    click({target: {}});
    click({target: {}});
    click({target: {}});
    detector.activity();
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(names(), []);
});

test('rage clicking with no reaction is a rage and a dead click', () => {
    const {click, names} = setup();
    click();
    click();
    click();
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(names(), [RAGE, DEAD]);
});

test('selecting text (double or triple click) is not frustration', () => {
    const {click, names} = setup();
    click();
    click({selectsText: true});
    click({selectsText: true});
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(names(), []);
});

test('an error during the chain is an error click with the error details', () => {
    const {detector, click, emitted} = setup();
    click();
    detector.activity();
    tick(500);
    detector.error({'exception.type': 'TypeError', 'exception.message': 'a'});
    detector.error({'exception.message': 'second error is ignored'});
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(emitted, [
        {
            eventName: ERROR,
            attributes: {
                'browser.css_selector': '#buy',
                'exception.type': 'TypeError',
                'exception.message': 'a',
            },
            timestamp: emitted[0].timestamp,
        },
    ]);
});

test('errors after the chain ended are not attributed to it', () => {
    const {detector, click, names} = setup();
    click();
    detector.activity();
    tick(CLICK_CHAIN_WINDOW_MS);
    detector.error({'exception.message': 'late'});
    assert.deepEqual(names(), []);
});

test('overlapping chains on different targets are judged on their own', () => {
    const {detector, click, emitted} = setup();
    const a = {};
    const b = {};
    click({target: a, attributes: {id: 'a'}});
    tick(500);
    click({target: b, attributes: {id: 'b'}});
    tick(CLICK_CHAIN_WINDOW_MS - 500);
    // `a` ended with no reaction, the reaction comes for `b`
    detector.activity();
    tick(500);
    assert.deepEqual(
        emitted.map((e) => [e.eventName, e.attributes.id]),
        [[DEAD, 'a']]
    );
});

test('flush ends chains now and does not report dead clicks', () => {
    const {detector, click, names} = setup();
    click();
    click();
    click();
    detector.error({'exception.message': 'x'});
    click({target: {}});
    detector.flush();
    assert.deepEqual(names(), [RAGE, ERROR]);
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(names(), [RAGE, ERROR]);
});

test('the page is watched only while a click waits for a reaction', () => {
    const {detector, click, hooks} = setup();
    click({target: {}});
    click({target: {}});
    assert.deepEqual(hooks, {watch: 1, unwatch: 0});
    detector.activity();
    assert.deepEqual(hooks, {watch: 1, unwatch: 1});
    click();
    assert.deepEqual(hooks, {watch: 2, unwatch: 1});
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(hooks, {watch: 2, unwatch: 2});
});

test('a request started by the click is a reaction', () => {
    const {detector, click, names} = setup();
    click();
    detector.requestStarted({});
    tick(CLICK_CHAIN_WINDOW_MS);
    assert.deepEqual(names(), []);
});

test('an error when a slow request responds is an error click', () => {
    const {detector, click, names} = setup();
    const request = {};
    click();
    detector.requestStarted(request);
    tick(3000);
    detector.requestEnded(request);
    tick(CLICK_CHAIN_WINDOW_MS - 1);
    detector.error({'exception.message': 'bad response'});
    assert.deepEqual(names(), [ERROR]);
});

test('errors more than 1s after the requests responded are not attributed', () => {
    const {detector, click, names} = setup();
    const a = {};
    const b = {};
    click();
    detector.requestStarted(a);
    detector.requestStarted(b);
    tick(2000);
    detector.requestEnded(a);
    tick(2000);
    // still waiting for `b`
    detector.requestEnded(b);
    tick(CLICK_CHAIN_WINDOW_MS);
    detector.error({'exception.message': 'late'});
    assert.deepEqual(names(), []);
});

test('errors are never attributed more than 10s after the click', () => {
    const {detector, click, names} = setup();
    click();
    detector.requestStarted({});
    tick(MAX_ERROR_WINDOW_MS);
    detector.error({'exception.message': 'late'});
    assert.deepEqual(names(), []);
});

test('requests started after the chain ended do not extend it', () => {
    const {detector, click, names} = setup();
    click();
    detector.activity();
    tick(CLICK_CHAIN_WINDOW_MS);
    detector.requestStarted({});
    tick(500);
    detector.error({'exception.message': 'unrelated'});
    assert.deepEqual(names(), []);
});

test('flush stops waiting for requests', () => {
    const {detector, click, names} = setup();
    click();
    detector.requestStarted({});
    tick(CLICK_CHAIN_WINDOW_MS);
    detector.flush();
    detector.error({'exception.message': 'after leaving'});
    assert.deepEqual(names(), []);
});
