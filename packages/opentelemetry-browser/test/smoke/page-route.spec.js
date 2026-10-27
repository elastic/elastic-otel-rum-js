/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should add url.template to spans and logs', async ({page}) => {
    const collector = createCollector(page);
    page.route('**/api/items/*', (route) =>
        route.fulfill({status: 200, contentType: 'text/plain', body: 'ok'})
    );

    await page.goto('/fixtures/use-page-route.html?ref=ad');
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
            'http://localhost:3000/fixtures/use-page-route.html?ref=ad',
            '/fixtures/use-page-route.html',
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
    expect(fetchSpan?.attributes['url.template']).toStrictEqual(
        '/product/:productId'
    );
});
