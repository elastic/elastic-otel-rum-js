/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should export browser navigation related events', async ({page}) => {
    const collector = createCollector(page);
    await page.goto('/fixtures/use-document-load.html?sync=true');

    // Make a soft navigation
    await page.evaluate(() => history.pushState({}, '', '/with-push.html'));

    const scopeName = '@opentelemetry/instrumentation-browser-navigation';
    const logs = (await collector.getLogs()).filter(l => l.scope.name === scopeName);

    // 1st is a hard navigation
    expect(logs[0].eventName).toEqual('browser.navigation');
    expect(logs[0].attributes['browser.navigation.same_document']).toEqual(
        false
    );
    expect(logs[0].attributes['browser.navigation.hash_change']).toEqual(false);

    // 2nd is a soft navigation
    expect(logs[1].eventName).toEqual('browser.navigation');
    expect(logs[1].attributes['browser.navigation.same_document']).toEqual(
        true
    );
    expect(logs[1].attributes['browser.navigation.hash_change']).toEqual(false);
    expect(logs[1].attributes['browser.navigation.type']).toEqual('push');
    expect(logs[1].attributes['url.full']).toEqual(
        'http://localhost:3000/with-push.html'
    );
});
