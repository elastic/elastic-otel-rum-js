/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should export browser navigation related events', async ({page}) => {
    // Disable `@opentelemetry/instrumentation-user-interaction` instrumentation to avoid double
    // wrapping of the history API which overrides the patch if browser navigation.
    // TODO: create issue and discuss in the SIG
    const config = encodeURIComponent(
        JSON.stringify({
            configInstrumentations: {
                '@opentelemetry/instrumentation-user-interaction': {
                    enabled: false,
                },
            },
        })
    );

    const collector = createCollector(page);
    await page.goto(
        `/fixtures/use-document-load.html?config=${config}&sync=true`
    );

    // Make a soft navigation
    await page.evaluate(() => history.pushState({}, '', '/with-push.html'));

    const logs = await collector.getLogs();
    expect(logs.length).toEqual(2);

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
