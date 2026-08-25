/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {afterEach, beforeEach, test} from 'node:test';

import {currentSessionAttributes} from '../../lib/enrichment.js';
import {
    clearReplayRecording,
    markReplayRecording,
} from '../../lib/replay-state.js';
import {closeSession, initSession} from '../../lib/session.js';

function installBrowserMocks() {
    const store = new Map();
    globalThis.sessionStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
    };
    globalThis.window = {
        addEventListener() {},
        removeEventListener() {},
        innerWidth: 1280,
        innerHeight: 720,
        devicePixelRatio: 2,
    };
    globalThis.document = {cookie: ''};
    globalThis.location = {protocol: 'http:', href: 'http://localhost/', pathname: '/'};
    globalThis.BroadcastChannel = class {
        postMessage() {}
        close() {}
        set onmessage(_fn) {}
    };
}

beforeEach(() => {
    installBrowserMocks();
    initSession();
    clearReplayRecording();
});

afterEach(() => {
    closeSession();
    clearReplayRecording();
});

test('omits rum.has_replay until recording actually starts', () => {
    assert.equal(currentSessionAttributes()['rum.has_replay'], undefined);
});

test('stamps rum.has_replay on session attrs after recording starts', () => {
    markReplayRecording();
    assert.equal(currentSessionAttributes()['rum.has_replay'], true);
});
