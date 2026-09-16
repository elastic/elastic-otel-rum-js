/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

test('should export unhandled exceptions and promise rejections', async ({
    page,
}) => {
    const collector = createCollector(page);
    await page.goto('/fixtures/use-navigation-timing.html');

    // Discard all telemetry related to page load & web vitals
    let logs = await collector.getLogs();
    collector.clear();

    // Trigger a regular error
    await page.evaluate(() => {
        const event = new Event('error', {cancelable: true});
        const error = new Error('Somethig wrong happened!');
        Object.defineProperty(event, 'error', {value: error});
        window.dispatchEvent(event);
    });

    logs = await collector.getLogs();
    let errorLogs = logs.filter(
        (l) => l.scope.name === '@opentelemetry/browser-instrumentation/errors'
    );
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0]?.eventName).toBe('exception');
    expect(errorLogs[0]?.attributes['exception.message']).toBe(
        'Somethig wrong happened!'
    );
    collector.clear();

    // Trigger a `unhandledrejection` event
    await page.evaluate(() => {
        const event = new Event('unhandledrejection');
        const reason = new Error('Somethig wrong happened!');
        Object.defineProperty(event, 'reason', {value: reason});
        window.dispatchEvent(event);
    });

    logs = await collector.getLogs();
    errorLogs = logs.filter(
        (l) => l.scope.name === '@opentelemetry/browser-instrumentation/errors'
    );
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0]?.eventName).toBe('exception');
    expect(errorLogs[0]?.attributes['exception.message']).toBe(
        'Somethig wrong happened!'
    );
    expect(errorLogs[0]?.attributes['exception.type']).toBe('Error');
});
