/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {mock, test} from 'node:test';

import {generateUUID} from '../../lib/session/id.js';
import {
    SessionLogRecordProcessor,
    SessionSpanProcessor,
} from '../../lib/session/processors.js';

test('SessionSpanProcessor - should add session attributes', () => {
    const id = generateUUID();
    const sampled = true;
    const session = {id, sampled, samplingRate: 1};
    const attrs = {
        'session.id': id,
        'session.sampling_rate': 1,
        'browser.tab.id': generateUUID(),
    };
    const managerMock = {
        getSession: mock.fn(() => session),
        getTabId: mock.fn(() => attrs['browser.tab.id']),
    };
    const processor = new SessionSpanProcessor({
        // @ts-expect-error -- using a mock
        manager: managerMock,
    });
    const spanMock = {
        attributes: undefined,
        setAttributes: mock.fn((attrs) => {
            spanMock.attributes = attrs;
        }),
    };
    const ctx = {};

    // @ts-expect-error -- we do not need a full span here
    processor.onStart(spanMock, ctx);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(managerMock.getTabId.mock.callCount(), 1);
    assert.strictEqual(spanMock.setAttributes.mock.callCount(), 1);
    assert.deepStrictEqual(spanMock.setAttributes.mock.calls[0].arguments, [
        attrs,
    ]);

    mock.reset();
});

test('SessionLogRecorsProcessor - should add session attributes', () => {
    const id = generateUUID();
    const sampled = true;
    const session = {id, sampled, samplingRate: 1};
    const attrs = {
        'session.id': id,
        'session.sampling_rate': 1,
        'browser.tab.id': generateUUID(),
    };
    const managerMock = {
        getSession: mock.fn(() => session),
        getTabId: mock.fn(() => attrs['browser.tab.id']),
    };
    const processor = new SessionLogRecordProcessor({
        // @ts-expect-error -- using a mock
        manager: managerMock,
    });
    const logRecordMock = {
        setAttributes: mock.fn(() => undefined),
    };
    const ctx = {};

    // @ts-expect-error -- we do not need a full span here
    processor.onEmit(logRecordMock, ctx);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(managerMock.getTabId.mock.callCount(), 1);
    assert.deepStrictEqual(
        logRecordMock.setAttributes.mock.calls[0].arguments,
        [attrs]
    );

    mock.reset();
});
