/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {afterEach, test} from 'node:test';
import {ExportResultCode} from '@opentelemetry/core';

import {configureCapture, DROP_ATTR, pauseCapture, resumeCapture} from '../../lib/capture.js';
import {GatedExporter, RetryingExporter} from '../../lib/exporter.js';

afterEach(() => {
    configureCapture({});
    resumeCapture();
});

test('GatedExporter drops paused and marked items', async () => {
    const sent = [];
    const inner = {
        export(items, cb) {
            sent.push(items);
            cb({code: ExportResultCode.SUCCESS});
        },
        shutdown() {
            return Promise.resolve();
        },
    };
    const exporter = new GatedExporter(inner, 'span');

    await new Promise((resolve) => {
        exporter.export([{attributes: {a: 1}}], () => resolve());
    });
    assert.equal(sent.length, 1);

    pauseCapture();
    await new Promise((resolve) => {
        exporter.export([{attributes: {a: 2}}], () => resolve());
    });
    assert.equal(sent.length, 1);
    resumeCapture();

    await new Promise((resolve) => {
        exporter.export([{attributes: {[DROP_ATTR]: true}}], () => resolve());
    });
    assert.equal(sent.length, 1);
});

test('GatedExporter honors beforeSend false', async () => {
    configureCapture({
        beforeSend: () => false,
    });
    const sent = [];
    const exporter = new GatedExporter(
        {
            export(items, cb) {
                sent.push(items);
                cb({code: ExportResultCode.SUCCESS});
            },
            shutdown() {
                return Promise.resolve();
            },
        },
        'log'
    );
    await new Promise((resolve) => {
        exporter.export([{attributes: {n: 1}}], () => resolve());
    });
    assert.equal(sent.length, 0);
});

test('RetryingExporter retries then succeeds', async () => {
    let calls = 0;
    const exporter = new RetryingExporter(
        {
            export(_items, cb) {
                calls += 1;
                if (calls < 3) {
                    cb({code: ExportResultCode.FAILED});
                    return;
                }
                cb({code: ExportResultCode.SUCCESS});
            },
            shutdown() {
                return Promise.resolve();
            },
        },
        {maxRetries: 3, baseDelayMs: 1}
    );
    const result = await new Promise((resolve) => {
        exporter.export([{}], resolve);
    });
    assert.equal(result.code, ExportResultCode.SUCCESS);
    assert.equal(calls, 3);
});
