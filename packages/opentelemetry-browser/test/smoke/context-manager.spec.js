/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test.skip('should carry context on different async operations and functions', async ({page}) => {
    const collector = createCollector(page);
    await page.goto('/fixtures/use-context.html');

    // Discard all telemetry related to page load
    let spans = await collector.getSpans();
    // collector.resetData()

    // Timeout
    console.log('timeout test')
    await page.click('#timeout');
    spans = await collector.getSpans();
    const timeoutSpan = spans.find((s) => s.name === 'timeout-child');
    expect(timeoutSpan).toBeDefined();

});
