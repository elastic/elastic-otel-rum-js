/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {SpanKind} from '@opentelemetry/api';

import {RequestSpanProcessor} from '../../lib/frustration/processor.js';

test('the span processor reports client and producer spans as requests', () => {
    /** @type {string[]} */
    const calls = [];
    const processor = new RequestSpanProcessor({
        requestStarted: () => calls.push('start'),
        requestEnded: () => calls.push('end'),
    });
    for (const kind of [
        SpanKind.CLIENT,
        SpanKind.PRODUCER,
        SpanKind.INTERNAL,
        SpanKind.SERVER,
        SpanKind.CONSUMER,
    ]) {
        processor.onStart({kind});
        processor.onEnd({kind});
    }
    assert.deepEqual(calls, ['start', 'end', 'start', 'end']);
});
