/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import {
    inferPageRoute,
    PageRouteLogRecordProcessor,
    PageRouteManager,
    PageRouteSpanProcessor,
    resolvePageRouteConfig,
} from '../../lib/page-route.js';

/** @param {string} href */
function setup(href) {
    const page = {href};
    /** @type {string[]} */
    const resolved = [];
    const manager = new PageRouteManager({getHref: () => page.href});
    /** @param {URL} url */
    const resolver = (url) => {
        resolved.push(url.href);
        const match = url.pathname.match(/^\/product\/[^/]+$/);
        return match ? '/product/{id}' : undefined;
    };
    return {page, manager, resolved, resolver};
}

/** @param {Record<string, unknown>} [attributes] */
function createSignal(attributes = {}) {
    return {
        attributes,
        /** @param {string} key @param {string} value */
        setAttribute(key, value) {
            this.attributes[key] = value;
        },
    };
}

test('inferPageRoute', async (t) => {
    /** @type {Array<[string, string]>} */
    const cases = [
        ['https://shop.test/', '/'],
        ['https://shop.test/product/123?ref=ad', '/product/{id}'],
        ['https://shop.test/product/456', '/product/{id}'],
        [
            'https://shop.test/orders/0f8fad5b-d9cb-469f-a165-70867728950e/items/2',
            '/orders/{id}/items/{id}',
        ],
        ['https://shop.test/u/507f1f77bcf86cd799439011', '/u/{id}'],
        ['https://shop.test/u/01ARZ3NDEKTSV4RRFFQ69G5FAV', '/u/{id}'],
        ['https://shop.test/blog/2024-recap', '/blog/2024-recap'],
        ['https://shop.test/v2/products', '/v2/products'],
        ['https://shop.test/deadbeefdeadbeef', '/deadbeefdeadbeef'],
        ['https://shop.test/docs/#install', '/docs/'],
        ['https://shop.test/#/cart/42?step=2', '/#/cart/{id}'],
        ['https://shop.test/app/#!/cart/42', '/app/#!/cart/{id}'],
    ];
    for (const [href, expected] of cases) {
        await t.test(href, () => {
            assert.strictEqual(inferPageRoute(new URL(href)), expected);
            assert.strictEqual(inferPageRoute(href), expected);
        });
    }
});

test('resolvePageRouteConfig', () => {
    /** @param {URL} url */
    const resolver = (url) => url.pathname;

    assert.strictEqual(resolvePageRouteConfig(undefined), inferPageRoute);
    assert.strictEqual(resolvePageRouteConfig(resolver), resolver);
    assert.strictEqual(resolvePageRouteConfig(false), undefined);
    // @ts-expect-error - testing invalid input
    assert.strictEqual(resolvePageRouteConfig('/cart'), inferPageRoute);
    // @ts-expect-error - testing invalid input
    assert.strictEqual(resolvePageRouteConfig(true), inferPageRoute);
});

test('PageRouteManager', async (t) => {
    await t.test('returns undefined without resolver or route', () => {
        const {manager} = setup('https://shop.test/product/1');
        assert.strictEqual(manager.getRoute(), undefined);
    });

    await t.test('resolves once per URL', () => {
        const {page, manager, resolved, resolver} = setup(
            'https://shop.test/product/1'
        );
        manager.setResolver(resolver);

        assert.strictEqual(manager.getRoute(), '/product/{id}');
        assert.strictEqual(manager.getRoute(), '/product/{id}');
        assert.deepStrictEqual(resolved, ['https://shop.test/product/1']);

        page.href = 'https://shop.test/cart';
        assert.strictEqual(manager.getRoute(), undefined);
        page.href = 'https://shop.test/product/2';
        assert.strictEqual(manager.getRoute(), '/product/{id}');
        assert.deepStrictEqual(resolved, [
            'https://shop.test/product/1',
            'https://shop.test/cart',
            'https://shop.test/product/2',
        ]);
    });

    await t.test('ignores invalid resolvers and results', () => {
        const {manager} = setup('https://shop.test/product/1');

        // @ts-expect-error - testing invalid output
        manager.setResolver(() => 42);
        assert.strictEqual(manager.getRoute(), undefined);

        manager.setResolver(() => '');
        assert.strictEqual(manager.getRoute(), undefined);

        manager.setResolver(() => {
            throw new Error('boom');
        });
        assert.strictEqual(manager.getRoute(), undefined);
    });

    await t.test('set route wins over the resolver', () => {
        const {manager, resolver} = setup('https://shop.test/product/1');
        manager.setResolver(resolver);
        manager.setRoute('/product/:productId');
        assert.strictEqual(manager.getRoute(), '/product/:productId');

        manager.setRoute(undefined);
        assert.strictEqual(manager.getRoute(), '/product/{id}');
    });

    await t.test('set route survives query and anchor changes', () => {
        const {page, manager} = setup('https://shop.test/search');
        manager.setRoute('/search');

        page.href = 'https://shop.test/search?q=shoes';
        assert.strictEqual(manager.getRoute(), '/search');
        page.href = 'https://shop.test/search?q=shoes#results';
        assert.strictEqual(manager.getRoute(), '/search');
    });

    await t.test('set route is dropped when the page changes', () => {
        const {page, manager, resolver} = setup('https://shop.test/cart');
        manager.setResolver(resolver);
        manager.setRoute('/cart');

        page.href = 'https://shop.test/product/1';
        assert.strictEqual(manager.getRoute(), '/product/{id}');

        // going back does not restore it
        page.href = 'https://shop.test/cart';
        assert.strictEqual(manager.getRoute(), undefined);
    });

    await t.test('set route is dropped when the hash route changes', () => {
        const {page, manager} = setup('https://shop.test/#/cart');
        manager.setRoute('/#/cart');

        page.href = 'https://shop.test/#/cart?step=2';
        assert.strictEqual(manager.getRoute(), '/#/cart');
        page.href = 'https://shop.test/#/product/1';
        assert.strictEqual(manager.getRoute(), undefined);
    });

    await t.test('ignores invalid routes', () => {
        const {manager} = setup('https://shop.test/cart');
        manager.setRoute('/cart');

        // @ts-expect-error - testing invalid input
        manager.setRoute(42);
        assert.strictEqual(manager.getRoute(), '/cart');

        manager.setRoute('');
        assert.strictEqual(manager.getRoute(), undefined);
    });
});

test('processors add url.template', () => {
    const {manager} = setup('https://shop.test/cart');
    const spanProcessor = new PageRouteSpanProcessor(manager);
    const logProcessor = new PageRouteLogRecordProcessor(manager);

    /** @param {ReturnType<typeof createSignal>} signal */
    const process = (signal) => {
        spanProcessor.onStart(signal);
        logProcessor.onEmit(signal);
        return signal.attributes;
    };

    assert.deepStrictEqual(process(createSignal()), {});

    manager.setRoute('/cart');
    assert.deepStrictEqual(process(createSignal()), {'url.template': '/cart'});
    assert.deepStrictEqual(
        process(createSignal({'url.template': '/api/items/{id}'})),
        {'url.template': '/api/items/{id}'}
    );
});
