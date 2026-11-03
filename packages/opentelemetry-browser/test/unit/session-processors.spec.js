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

test('SessionSpanProcessor - forwards spans to inner processors if session is sampled', () => {
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
    const processorMock = {
        onStart: mock.fn(() => undefined),
        onEnd: mock.fn(() => undefined),
        forceFlush: mock.fn(() => Promise.resolve()),
        shutdown: mock.fn(() => Promise.resolve()),
    };
    const processor = new SessionSpanProcessor({
        // @ts-expect-error -- using a mock
        manager: managerMock,
        processors: [processorMock],
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
    assert.strictEqual(processorMock.onStart.mock.callCount(), 1);
    assert.deepEqual(processorMock.onStart.mock.calls[0].arguments, [
        spanMock,
        ctx,
    ]);

    // @ts-expect-error -- we do not need a full span here
    processor.onEnd(spanMock);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(processorMock.onEnd.mock.callCount(), 1);
    assert.deepEqual(processorMock.onEnd.mock.calls[0].arguments, [spanMock]);

    processor.forceFlush();
    assert.strictEqual(processorMock.forceFlush.mock.callCount(), 1);

    processor.shutdown();
    assert.strictEqual(processorMock.shutdown.mock.callCount(), 1);

    mock.reset();
});

test('SessionSpanProcessor - does not forward spans to inner processors if session is not sampled', () => {
    const id = generateUUID();
    const sampled = false;
    const session = {id, sampled, samplingRate: 0};
    const attrs = {
        'session.id': id,
        'session.sampling_rate': 0,
        'browser.tab.id': generateUUID(),
    };
    const managerMock = {
        getSession: mock.fn(() => session),
        getTabId: mock.fn(() => attrs['browser.tab.id']),
    };
    const processorMock = {
        onStart: mock.fn(() => undefined),
        onEnd: mock.fn(() => undefined),
        forceFlush: mock.fn(() => Promise.resolve()),
        shutdown: mock.fn(() => Promise.resolve()),
    };
    const processor = new SessionSpanProcessor({
        // @ts-expect-error -- using a mock
        manager: managerMock,
        processors: [processorMock],
    });
    const spanMock = {
        setAttributes: mock.fn(() => undefined),
    };
    const ctx = {};

    // @ts-expect-error -- we do not need a full span here
    processor.onStart(spanMock, ctx);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(managerMock.getTabId.mock.callCount(), 0);
    assert.strictEqual(spanMock.setAttributes.mock.callCount(), 0);
    assert.strictEqual(processorMock.onStart.mock.callCount(), 0);

    // @ts-expect-error -- we do not need a full span here
    processor.onEnd(spanMock);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(processorMock.onEnd.mock.callCount(), 0);

    processor.forceFlush();
    assert.strictEqual(processorMock.forceFlush.mock.callCount(), 1);

    processor.shutdown();
    assert.strictEqual(processorMock.shutdown.mock.callCount(), 1);

    mock.reset();
});

test('SessionSpanProcessor - forwards spans that started on a sampled session', () => {
    const id = generateUUID();
    const sampled = true;
    const session = {id, sampled, samplingRate: 0.5};
    const attrs = {
        'session.id': id,
        'session.sampling_rate': 0.5,
        'browser.tab.id': generateUUID(),
    };
    const managerMock = {
        getSession: mock.fn(() => session),
        getTabId: mock.fn(() => attrs['browser.tab.id']),
    };
    const processorMock = {
        onStart: mock.fn(() => undefined),
        onEnd: mock.fn(() => undefined),
        forceFlush: mock.fn(() => Promise.resolve()),
        shutdown: mock.fn(() => Promise.resolve()),
    };
    const processor = new SessionSpanProcessor({
        // @ts-expect-error -- using a mock
        manager: managerMock,
        processors: [processorMock],
    });
    const spanMock = {
        attributes: undefined,
        setAttributes: mock.fn((attrs) => {
            spanMock.attributes = attrs;
        }),
    };
    const ctx = {};

    // Start the span with the sampled session
    // @ts-expect-error -- we do not need a full span here
    processor.onStart(spanMock, ctx);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(managerMock.getTabId.mock.callCount(), 1);
    assert.strictEqual(spanMock.setAttributes.mock.callCount(), 1);
    assert.deepStrictEqual(spanMock.setAttributes.mock.calls[0].arguments, [
        attrs,
    ]);
    assert.strictEqual(processorMock.onStart.mock.callCount(), 1);
    assert.deepEqual(processorMock.onStart.mock.calls[0].arguments, [
        spanMock,
        ctx,
    ]);

    // Change to a new session that isn't sampled
    session.id = generateUUID();
    session.sampled = false;

    // @ts-expect-error -- we do not need a full span here
    processor.onEnd(spanMock);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(processorMock.onEnd.mock.callCount(), 1);
    assert.deepEqual(processorMock.onEnd.mock.calls[0].arguments, [spanMock]);

    processor.forceFlush();
    assert.strictEqual(processorMock.forceFlush.mock.callCount(), 1);

    processor.shutdown();
    assert.strictEqual(processorMock.shutdown.mock.callCount(), 1);

    mock.reset();
});

test('SessionLogRecorsProcessor - forwards log records to inner processors is session is sampled', () => {
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
    const processorMock = {
        onEmit: mock.fn(() => undefined),
        forceFlush: mock.fn(() => Promise.resolve()),
        shutdown: mock.fn(() => Promise.resolve()),
    };
    const processor = new SessionLogRecordProcessor({
        // @ts-expect-error -- using a mock
        manager: managerMock,
        processors: [processorMock],
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
    assert.strictEqual(processorMock.onEmit.mock.callCount(), 1);
    assert.deepEqual(processorMock.onEmit.mock.calls[0].arguments, [
        logRecordMock,
        ctx,
    ]);

    processor.forceFlush();
    assert.strictEqual(processorMock.forceFlush.mock.callCount(), 1);

    processor.shutdown();
    assert.strictEqual(processorMock.shutdown.mock.callCount(), 1);

    mock.reset();
});

test('SessionLogRecorsProcessor - does not forward log records to inner processors is session is not sampled', () => {
    const id = generateUUID();
    const sampled = false;
    const session = {id, sampled, samplingRate: 0};
    const attrs = {
        'session.id': id,
        'session.sampling_rate': 0,
        'browser.tab.id': generateUUID(),
    };
    const managerMock = {
        getSession: mock.fn(() => session),
        getTabId: mock.fn(() => attrs['browser.tab.id']),
    };
    const processorMock = {
        onEmit: mock.fn(() => undefined),
        forceFlush: mock.fn(() => Promise.resolve()),
        shutdown: mock.fn(() => Promise.resolve()),
    };
    const processor = new SessionLogRecordProcessor({
        // @ts-expect-error -- using a mock
        manager: managerMock,
        processors: [processorMock],
    });
    const logRecordMock = {
        setAttributes: mock.fn(() => undefined),
    };
    const ctx = {};

    // @ts-expect-error -- we do not need a full span here
    processor.onEmit(logRecordMock, ctx);
    assert.strictEqual(managerMock.getSession.mock.callCount(), 1);
    assert.strictEqual(managerMock.getTabId.mock.callCount(), 0);
    assert.strictEqual(processorMock.onEmit.mock.callCount(), 0);

    processor.forceFlush();
    assert.strictEqual(processorMock.forceFlush.mock.callCount(), 1);

    processor.shutdown();
    assert.strictEqual(processorMock.shutdown.mock.callCount(), 1);

    mock.reset();
});
