/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {applyWebVitalAttribution} from '../../lib/vitals.js';

test('applyWebVitalAttribution flattens LCP/INP/CLS fields', () => {
    const lcp = {
        attributes: {'browser.web_vital.name': 'lcp'},
        body: JSON.stringify({
            element: 'img#hero',
            url: 'https://cdn/hero.jpg',
            timeToFirstByte: 120,
            resourceLoadDelay: 40,
            resourceLoadDuration: 200,
            elementRenderDelay: 30,
        }),
    };
    applyWebVitalAttribution(lcp);
    assert.equal(lcp.attributes['browser.web_vital.lcp.element'], 'img#hero');
    assert.equal(lcp.attributes['browser.web_vital.lcp.ttfb'], 120);

    const inp = {
        attributes: {'browser.web_vital.name': 'inp'},
        body: JSON.stringify({
            interactionTarget: 'button#buy',
            interactionType: 'pointer',
            inputDelay: 12,
            processingDuration: 40,
            presentationDelay: 8,
        }),
    };
    applyWebVitalAttribution(inp);
    assert.equal(inp.attributes['browser.web_vital.inp.target'], 'button#buy');
    assert.equal(inp.attributes['browser.web_vital.inp.input_delay'], 12);

    const cls = {
        attributes: {'browser.web_vital.name': 'cls'},
        body: JSON.stringify({
            largestShiftTarget: 'div.banner',
            largestShiftValue: 0.12,
        }),
    };
    applyWebVitalAttribution(cls);
    assert.equal(cls.attributes['browser.web_vital.cls.source'], 'div.banner');
});
