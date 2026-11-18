/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

const FIXTURE = '/fixtures/use-frustration.html';
const RAGE = 'browser.frustration.rage_click';
const DEAD = 'browser.frustration.dead_click';
const ERROR = 'browser.frustration.error_click';

/**
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, any>} [config]
 */
async function open(page, config = {}) {
    const collector = createCollector(page);
    await page.route('**/api/slow', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.fulfill({status: 200, body: 'ok'});
    });
    const query = encodeURIComponent(JSON.stringify(config));
    await page.goto(`${FIXTURE}?config=${query}`);
    await page.waitForFunction(() => globalThis.edotBrowser);
    return collector;
}

/**
 * Frustration logs once the clicks are classified, which takes 1s.
 * @param {import('@playwright/test').Page} page
 * @param {import('./test-utils').Collector} collector
 */
async function frustrationLogs(page, collector) {
    await page.waitForTimeout(1500);
    const logs = await collector.getLogs();
    return logs.filter((l) => l.eventName.startsWith('browser.frustration.'));
}

test('reports dead clicks only on clickable elements that do not react', async ({
    page,
}) => {
    const collector = await open(page, {
        frustration: {ignoreSelectors: ['.map']},
    });

    for (const sel of ['#reacts', '#slow', '#text', '#field', '.map']) {
        await page.click(sel);
    }
    // Any reaction counts for all pending clicks, so wait for them to end
    await page.waitForTimeout(1200);
    await page.click('#dead');
    await page.click('#pointer');

    const logs = await frustrationLogs(page, collector);
    expect(
        logs.map((l) => [l.eventName, l.attributes['browser.css_selector']])
    ).toStrictEqual([
        [DEAD, '#dead'],
        [DEAD, '#pointer'],
    ]);
    const attrs = logs[0].attributes;
    expect(attrs['browser.tag_name']).toStrictEqual('BUTTON');
    expect(attrs['url.full']).toContain(FIXTURE);
    expect(attrs['session.id']).toBeDefined();
    expect(attrs['browser.page.x']).toBeGreaterThan(0);
});

test('reports a rage click once per burst, with the click count', async ({
    page,
}) => {
    const collector = await open(page);

    for (let i = 0; i < 4; i++) {
        await page.click('#reacts', {delay: 20});
    }

    const logs = await frustrationLogs(page, collector);
    expect(logs.map((l) => l.eventName)).toStrictEqual([RAGE]);
    expect(logs[0].attributes['browser.frustration.click_count']).toStrictEqual(
        4
    );
});

test('reports clicks on an icon as clicks on its button', async ({page}) => {
    const collector = await open(page);

    for (let i = 0; i < 3; i++) {
        await page.click('#wrapped .icon');
    }

    const logs = await frustrationLogs(page, collector);
    expect(logs.map((l) => l.attributes['browser.css_selector'])).toStrictEqual(
        ['#wrapped', '#wrapped']
    );
});

test('reports error clicks with the error', async ({page}) => {
    const collector = await open(page);

    await page.click('#broken');

    const logs = await frustrationLogs(page, collector);
    const errorClick = logs.find((l) => l.eventName === ERROR);
    expect(errorClick?.attributes['exception.type']).toStrictEqual('Error');
    expect(errorClick?.attributes['exception.message']).toStrictEqual('boom');
});

test('reports error clicks when a slow request the click started fails', async ({
    page,
}) => {
    const collector = await open(page);

    await page.click('#slow-broken');
    // The response takes 2s
    await page.waitForTimeout(2000);

    const logs = await frustrationLogs(page, collector);
    expect(
        logs.map((l) => [l.eventName, l.attributes['exception.message']])
    ).toStrictEqual([[ERROR, 'bad response']]);
});

test('exports a rage click when the page is hidden right after it', async ({
    page,
}) => {
    const collector = await open(page);
    await collector.getLogs();
    collector.clear();

    for (let i = 0; i < 3; i++) {
        await page.click('#reacts');
    }

    // `getLogs` hides the page, so the export has to include the rage click
    // even though its chain has not ended yet
    const logs = await collector.getLogs();
    expect(logs.map((l) => l.eventName)).toContain(RAGE);
});

test('can be disabled', async ({page}) => {
    const collector = await open(page, {frustration: false});

    for (let i = 0; i < 3; i++) {
        await page.click('#dead');
    }

    expect(await frustrationLogs(page, collector)).toStrictEqual([]);
});
