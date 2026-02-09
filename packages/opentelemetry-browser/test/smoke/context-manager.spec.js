/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should carry context on different async operations and functions', async ({
    page,
}) => {
    // Disabling `@opentelemetry/instrumentation-fetch` to avoid extra exports
    // because of the export instrumentation issue
    // ref: https://github.com/open-telemetry/opentelemetry-js/issues/6339
    const config = encodeURIComponent(
        JSON.stringify({
            configInstrumentations: {
                fetch: {enabled: false},
            },
        })
    );
    const collector = createCollector(page);
    await page.goto(`/fixtures/use-context.html?config=${config}`);

    // Discard all telemetry related to page load
    let spans = await collector.getSpans();
    collector.clear();

    let parentSpan, childSpan;
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
        // TODO: enable when there is a fix for https://github.com/open-telemetry/opentelemetry-js/issues/6339
        // 'fetch',
    ];
    for (const id of buttonIds) {
        // Clear previous exports
        collector.clear();
        // Click and wait for:
        // - the JS logic of the page to finish (specifically for XHR & fetch)
        // - the spans to be collected
        await page.click(`#${id}`);
        await page.waitForFunction(
            () => document.getElementById('status').innerText === 'finished'
        );
        spans = await collector.getSpans();

        // Get the span created in the callback
        childSpan = spans.find((s) => s.name === `${id}-child`);
        expect(childSpan).toBeDefined();
        expect(childSpan.parentSpanId).toBeDefined();

        // Parent span presence means context has been propagated correctly.
        // Check that comes from the right user action
        parentSpan = spans.find((s) => s.spanId === childSpan.parentSpanId);
        expect(parentSpan).toBeDefined();
        expect(parentSpan.name).toStrictEqual('click');
        expect(parentSpan.attributes.target_xpath).toStrictEqual(
            `//*[@id="${id}"]`
        );
        expect(parentSpan.scope.name).toStrictEqual(
            '@opentelemetry/instrumentation-user-interaction'
        );
    }
});
