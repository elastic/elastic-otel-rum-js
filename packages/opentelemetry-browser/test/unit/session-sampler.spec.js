/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {generateUUID} from '../../lib/session/id.js';
import {SamplingDecision, SessionSampler} from '../../lib/session/sampler.js';

test('SessionSampler - uses default ratio if gets incorrect param', () => {
    const badImputs = [NaN, true, 'string', () => null, {}];

    for (const input of badImputs) {
        // @ts-expect-error -- types do not match the constructor
        const sampler = new SessionSampler(input);
        assert.strictEqual(sampler.toString(), 'SessionSampler(ratio=1)');
    }
});

test('SessionSampler - clamps the ratio value if out of bounds', () => {
    const samplerLower = new SessionSampler(-1);
    assert.strictEqual(samplerLower.toString(), 'SessionSampler(ratio=0)');

    const samplerHigher = new SessionSampler(1.5);
    assert.strictEqual(samplerHigher.toString(), 'SessionSampler(ratio=1)');
});

test('SessionSampler - trucated the ratio value up to 4 decimals', () => {
    const sampler = new SessionSampler(0.12354325);
    assert.strictEqual(sampler.toString(), 'SessionSampler(ratio=0.1235)');
});

test('SessionSampler - samples all sessions if ratio is 1', () => {
    const sampler = new SessionSampler(1);

    for (let i = 0; i < 100; i++) {
        const result = sampler.shouldSample(generateUUID());
        assert.strictEqual(
            result.decision,
            SamplingDecision.RECORD,
            'session sampled'
        );
    }
});

test('SessionSampler - samples no sessions if ratio is 0', () => {
    const sampler = new SessionSampler(0);

    for (let i = 0; i < 100; i++) {
        const result = sampler.shouldSample(generateUUID());
        assert.strictEqual(
            result.decision,
            SamplingDecision.NOT_RECORD,
            'session not sampled'
        );
    }
});

test('SessionSampler - samples according to the ratio', () => {
    const ratio = 0.7;
    const sampler = new SessionSampler(ratio);
    let sampledSessions = 0;

    for (let i = 0; i < 100; i++) {
        const result = sampler.shouldSample(generateUUID());
        if (result.decision === SamplingDecision.RECORD) {
            sampledSessions += 1;
        }
    }

    const rate = sampledSessions / 100;
    assert.notStrictEqual(rate, 0, 'does sample sessions');
    assert.notStrictEqual(rate, 1, 'does sample out sessions');
});
