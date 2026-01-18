/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';
import { createCollector } from './test-utils';

test('should not export if EDOT is disabled via configuration', async ({ page }) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(JSON.stringify({disabled: true}));
    await page.goto(`/fixtures/use-document-load.html?config=${config}`);

    const spans = await collector.getSpans();
    expect(spans.length).toStrictEqual(0);
});

test('should export if EDOT is enabled via configuration', async ({ page }) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(JSON.stringify({disabled: false}));
    await page.goto(`/fixtures/use-document-load.html?config=${config}`);

    const spans = await collector.getSpans();
    expect(spans.length).toBeGreaterThan(0);
});

test('should export if EDOT has the default configuration', async ({ page }) => {
    const collector = createCollector(page);
    await page.goto('/fixtures/use-document-load.html');

    const spans = await collector.getSpans();
    expect(spans.length).toBeGreaterThan(0);
});

