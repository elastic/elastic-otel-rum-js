/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test.only('should export browser navigation related events', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.goto('/fixtures/use-document-load.html');

    // Make a couple of navigations
    // - with push state
    await page.evaluate(() => history.pushState({}, '', '/with-push.html'));
    await new Promise((r) => setTimeout(r,1_000));
    // - with replace state
    await page.evaluate(() => history.replaceState({}, '', '/with-replace.html'));

    const logs = await collector.getLogs();
    console.log(logs)
    expect(logs.length).toBeGreaterThan(0);
});
