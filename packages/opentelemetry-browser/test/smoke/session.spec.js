/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

const FIXTURE = '/fixtures/use-navigation-timing.html';

test('should add session attributes to logs and emit session.start', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.goto(FIXTURE);

    const logs = await collector.getLogs();
    const sessionId = logs[0].attributes['session.id'];
    const tabId = logs[0].attributes['browser.tab.id'];

    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(tabId).toMatch(/^[0-9a-f-]{36}$/);
    for (const log of logs) {
        expect(log.attributes['session.id']).toStrictEqual(sessionId);
        expect(log.attributes['browser.tab.id']).toStrictEqual(tabId);
        expect(log.resource.attributes['session.id']).toBeUndefined();
    }

    const starts = logs.filter((l) => l.eventName === 'session.start');
    expect(starts.length).toStrictEqual(1);
    expect(starts[0].attributes['session.previous_id']).toBeUndefined();
});

test('should keep session and tab ids across reloads and share session between tabs', async ({
    context,
    page,
}) => {
    const collector = createCollector(page);
    await page.goto(FIXTURE);
    const [first] = await collector.getLogs();

    collector.clear();
    await page.reload();
    const reloaded = await collector.getLogs();
    expect(reloaded[0].attributes['session.id']).toStrictEqual(
        first.attributes['session.id']
    );
    expect(reloaded[0].attributes['browser.tab.id']).toStrictEqual(
        first.attributes['browser.tab.id']
    );
    expect(reloaded.some((l) => l.eventName === 'session.start')).toBe(false);

    const otherPage = await context.newPage();
    const otherCollector = createCollector(otherPage);
    await otherPage.goto(FIXTURE);
    const [other] = await otherCollector.getLogs();
    expect(other.attributes['session.id']).toStrictEqual(
        first.attributes['session.id']
    );
    expect(other.attributes['browser.tab.id']).not.toStrictEqual(
        first.attributes['browser.tab.id']
    );
});

test('should not add session attributes when disabled', async ({page}) => {
    const collector = createCollector(page);
    const config = encodeURIComponent(
        JSON.stringify({session: {enabled: false}})
    );
    await page.goto(`${FIXTURE}?config=${config}`);

    const logs = await collector.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    for (const log of logs) {
        expect(log.attributes['session.id']).toBeUndefined();
        expect(log.attributes['browser.tab.id']).toBeUndefined();
    }
});
