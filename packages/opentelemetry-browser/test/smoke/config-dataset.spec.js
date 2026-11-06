/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {test, expect} from '@playwright/test';
import {createCollector} from './test-utils';

for (const {name, resourceAttributes, dataset} of [
    {name: 'default', dataset: 'browser'},
    {
        name: 'undefined dataset',
        resourceAttributes: {'data_stream.dataset': undefined},
        dataset: 'browser',
    },
    {
        name: 'null dataset',
        resourceAttributes: {'data_stream.dataset': null},
        dataset: 'browser',
    },
    {
        name: 'empty resource attributes',
        resourceAttributes: {},
        dataset: 'browser',
    },
    {
        name: 'namespace without a dataset',
        resourceAttributes: {'data_stream.namespace': 'production'},
        dataset: 'browser',
    },
    {
        name: 'unrelated resource attributes',
        resourceAttributes: {'deployment.environment.name': 'production'},
        dataset: 'browser',
    },
    {
        name: 'custom dataset and namespace',
        resourceAttributes: {
            'data_stream.dataset': 'storefront',
            'data_stream.namespace': 'production',
        },
        dataset: 'storefront',
    },
    {
        name: 'generic dataset override',
        resourceAttributes: {'data_stream.dataset': 'generic'},
        dataset: 'generic',
    },
]) {
    test(`should export the dataset on all signals: ${name}`, async ({
        page,
    }) => {
        const collector = createCollector(page);
        const config = encodeURIComponent(JSON.stringify({disabled: true}));
        await page.goto(
            `/fixtures/use-navigation-timing.html?sync=true&config=${config}`
        );

        // Start directly in the page: JSON configuration would drop undefined
        // attributes and hide regressions in the dataset fallback.
        await page.evaluate((attributes) => {
            globalThis.edotBrowser = globalThis.startBrowserSdk({
                resourceAttributes: attributes,
            });
        }, resourceAttributes);

        await page.evaluate(async () => {
            // Same global API registry used by the context fixture.
            const api = globalThis[Symbol.for('opentelemetry.js.api.1')];
            api.trace.getTracer('dataset-test').startSpan('dataset-test').end();
            api.metrics
                .getMeter('dataset-test')
                .createCounter('dataset_test_count')
                .add(1);
            // Flush all providers, including metrics, without waiting for the
            // periodic metric export interval. Session startup supplies a log.
            await globalThis.edotBrowser.shutdown();
        });

        // Inspect OTLP resources directly to cover every provider, including
        // metrics (which the collector helper does not normalize yet).
        for (const [signal, resourceKey] of [
            ['traces', 'resourceSpans'],
            ['logs', 'resourceLogs'],
            ['metrics', 'resourceMetrics'],
        ]) {
            const requests = collector
                .getRequests()
                .filter((request) => request.url.endsWith(`/v1/${signal}`));
            expect(requests.length, `${signal} export`).toBeGreaterThan(0);
            for (const request of requests) {
                expect(request.data[resourceKey].length).toBeGreaterThan(0);
                for (const {resource} of request.data[resourceKey]) {
                    const attributes = Object.fromEntries(
                        resource.attributes.map(({key, value}) => [
                            key,
                            value.stringValue,
                        ])
                    );
                    expect(attributes['data_stream.dataset']).toBe(dataset);
                    expect(attributes).toMatchObject({
                        ...resourceAttributes,
                        'data_stream.dataset': dataset,
                    });
                    expect(attributes['telemetry.distro.name']).toBe('elastic');
                }
            }
        }
    });
}
