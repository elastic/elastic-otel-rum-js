/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should export document load spans', async ({page}) => {
    const collector = createCollector(page);
    await page.goto('/fixtures/use-navigation-timing.html');

    const content = await page.content();
    const traceparent = content.match(
        /<meta\s+name="traceparent"\s+content="([^"]+)"/
    )?.[1];
    const traceId = traceparent?.split('-')[1];

    const spans = await collector.getSpans();
    expect(spans.length).toEqual(1);

    const span = spans[0];
    expect(span.scope.name).toEqual(
        '@opentelemetry/browser-instrumentation/document-load'
    );
    expect(span.name).toEqual('documentLoad');
});
