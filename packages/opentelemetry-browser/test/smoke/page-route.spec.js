/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

const FIXTURE = '/fixtures/use-navigation-timing.html';

test('should add url.template to spans and logs', async ({page}) => {
    const collector = createCollector(page);
    page.route('**/api/items/*', (route) =>
        route.fulfill({status: 200, contentType: 'text/plain', body: 'ok'})
    );

    await page.goto(`${FIXTURE}?sync=true`);
    // Soft navigation with the route inferred from the URL
    await page.evaluate(() => history.pushState({}, '', '/product/123'));
    // Route set by the application wins until the path changes
    await page.evaluate(async () => {
        setPageRoute('/product/:productId');
        history.replaceState({}, '', '/product/123?tab=reviews');
        await fetch('/api/items/1');
        history.pushState({}, '', '/cart');
    });

    const logs = await collector.getLogs();
    const navigations = logs.filter(
        (l) => l.eventName === 'browser.navigation'
    );
    expect(
        navigations.map((l) => [
            l.attributes['url.full'],
            l.attributes['url.template'],
        ])
    ).toStrictEqual([
        [
            'http://localhost:3000/fixtures/use-navigation-timing.html?sync=true',
            '/fixtures/use-navigation-timing.html',
        ],
        ['http://localhost:3000/product/123', '/product/{id}'],
        [
            'http://localhost:3000/product/123?tab=reviews',
            '/product/:productId',
        ],
        ['http://localhost:3000/cart', '/cart'],
    ]);
    for (const log of logs) {
        expect(log.attributes['url.template']).toBeDefined();
    }

    const spans = await collector.getSpans();
    const fetchSpan = spans.find(
        (s) => s.scope.name === '@opentelemetry/browser-instrumentation/fetch'
    );
    // On client spans `url.template` is the template of the request URL
    expect(fetchSpan).toBeDefined();
    expect(fetchSpan?.attributes['url.template']).toBeUndefined();
});

test('should not infer url.template when "pageRoute" is false', async ({
    page,
}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(JSON.stringify({pageRoute: false}));

    await page.goto(`${FIXTURE}?sync=true&config=${config}`);
    await page.evaluate(() => history.pushState({}, '', '/product/123'));

    const navigations = (await collector.getLogs()).filter(
        (l) => l.eventName === 'browser.navigation'
    );
    expect(navigations.length).toStrictEqual(2);
    for (const log of navigations) {
        expect(log.attributes['url.template']).toBeUndefined();
    }
});

test('should warn about an invalid "pageRoute" value', async ({page}) => {
    /** @type {string[]} */
    const messages = [];
    // EDOT's logger prints warnings with `console.error`
    page.on('console', (msg) => messages.push(msg.text()));
    const config = encodeURIComponent(JSON.stringify({pageRoute: 'nope'}));
    await page.goto(`${FIXTURE}?config=${config}`);

    await expect
        .poll(() => messages.some((m) => m.includes('Invalid "pageRoute"')))
        .toBe(true);
});
