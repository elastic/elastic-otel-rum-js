/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should export user-action related spans', async ({page}) => {
    const collector = createCollector(page);

    await page.goto('/fixtures/use-navigation-timing.html');
    await page.click('body > h1');

    const logs = await collector.getLogs();
    const actionLogs = logs.filter(
        (l) =>
            l.scope.name ===
            '@opentelemetry/browser-instrumentation/user-action'
    );

    // We got logs
    expect(logs.length).toBeGreaterThan(0);
    expect(actionLogs.length).toStrictEqual(1);

    // Log record details
    expect(actionLogs[0].eventName).toStrictEqual('browser.user_action.click');
    expect(actionLogs[0].attributes['browser.tag_name']).toStrictEqual('H1');
    expect(
        actionLogs[0].attributes['browser.mouse_event.button']
    ).toStrictEqual('left');
    expect(actionLogs[0].attributes['browser.page.x']).toBeDefined();
    expect(actionLogs[0].attributes['browser.page.y']).toBeDefined();
});
