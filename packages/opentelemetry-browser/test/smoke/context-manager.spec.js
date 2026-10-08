/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef {Object} ReceivedSpan
 * @property {string} name
 * @property {string} spanId
 * @property {string} parentSpanId
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should carry context on different async operations and functions', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.goto('/fixtures/use-context.html');

    // Discard all telemetry related to page load
    const logs = collector.getLogs();
    /** @type {ReceivedSpan[]} */
    let spans;
    collector.clear();

    /** @type {ReceivedSpan | undefined} */
    let parentSpan;
    /** @type {ReceivedSpan | undefined} */
    let childSpan;
    const buttonIds = [
        'timeout',
        'promise-ctor',
        'promise-then-success',
        'promise-then-failure',
        'promise-catch',
        'promise-finally',
        'xhr-event',
        'xhr-prop',
        'xhr-target-prop',
        'fetch',
    ];
    for (const id of buttonIds) {
        // Clear previous exports
        collector.clear();
        // Click and wait for:
        // - the JS logic of the page to finish (specifically for XHR & fetch)
        // - the spans to be collected
        await page.click(`#${id}`);
        await page.waitForFunction(
            () => document.getElementById('status')?.innerText === 'finished'
        );
        spans = await collector.getSpans();

        // Get the span created in the callback
        childSpan = spans.find((s) => s.name === `${id}-child`);
        expect(childSpan).toBeDefined();
        expect(childSpan?.parentSpanId).toBeDefined();

        // Parent span presence means context has been propagated correctly.
        parentSpan = spans.find((s) => s.spanId === childSpan?.parentSpanId);
        expect(parentSpan).toBeDefined();
        expect(parentSpan?.name).toStrictEqual(id);
    }
});
