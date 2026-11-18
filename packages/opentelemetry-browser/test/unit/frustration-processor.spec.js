/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {SpanKind} from '@opentelemetry/api';

import {RequestSpanProcessor} from '../../lib/frustration/processor.js';

test('the span processor reports client spans as requests', () => {
    /** @type {string[]} */
    const calls = [];
    const processor = new RequestSpanProcessor({
        requestStarted: () => calls.push('start'),
        requestEnded: () => calls.push('end'),
    });
    processor.onStart({kind: SpanKind.CLIENT});
    processor.onStart({kind: SpanKind.INTERNAL});
    processor.onEnd({kind: SpanKind.CLIENT});
    processor.onEnd({kind: SpanKind.INTERNAL});
    assert.deepEqual(calls, ['start', 'end']);
});
