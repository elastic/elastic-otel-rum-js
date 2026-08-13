/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {resourceTimingAttributes} from '../../lib/timing.js';
import {breakpointBand} from '../../lib/device.js';

test('resourceTimingAttributes maps phases in ms', () => {
    const attrs = resourceTimingAttributes({
        startTime: 0,
        fetchStart: 15,
        domainLookupStart: 15,
        domainLookupEnd: 25,
        connectStart: 25,
        connectEnd: 45,
        secureConnectionStart: 30,
        requestStart: 45,
        responseStart: 80,
        responseEnd: 120,
        encodedBodySize: 2048,
        responseStatus: 200,
        renderBlockingStatus: 'blocking',
    });
    assert.equal(attrs['http.queue.duration'], 15);
    assert.equal(attrs['http.dns.duration'], 10);
    assert.equal(attrs['http.tcp.duration'], 20);
    assert.equal(attrs['http.tls.duration'], 15);
    assert.equal(attrs['http.request.duration'], 35);
    assert.equal(attrs['http.response.duration'], 40);
    assert.equal(attrs['http.response.size.encoded'], 2048);
    assert.equal(attrs['http.response.status_code'], 200);
    assert.equal(attrs['http.render_blocking_status'], 'blocking');
});

test('breakpointBand maps viewport widths', () => {
    assert.equal(breakpointBand(375), 'xs');
    assert.equal(breakpointBand(700), 's');
    assert.equal(breakpointBand(800), 'm');
    assert.equal(breakpointBand(1100), 'l');
    assert.equal(breakpointBand(1400), 'xl');
});
