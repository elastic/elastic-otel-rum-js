/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {DocumentLoadInstrumentation} from '@opentelemetry/instrumentation-document-load';
import {FetchInstrumentation} from '@opentelemetry/instrumentation-fetch';
import {LongTaskInstrumentation} from '@opentelemetry/instrumentation-long-task';
import {UserInteractionInstrumentation} from '@opentelemetry/instrumentation-user-interaction';
import {XMLHttpRequestInstrumentation} from '@opentelemetry/instrumentation-xml-http-request';
import {ExceptionInstrumentation} from '@opentelemetry/instrumentation-web-exception';

import {WebSdkBuilder} from './sdk-builder.js';
import {TracesSdk} from './traces.js';
import {LogsSdk} from './logs.js';
import {MetricsSdk} from './metrics.js';
import {WebVitalsInstrumentation} from './instrumentations/web-vitals.js';

/**
 * @typedef {{
 *  "@opentelemetry/instrumentation-document-load": import('@opentelemetry/instrumentation-document-load').DocumentLoadInstrumentationConfig;
 *  "@opentelemetry/instrumentation-fetch": import('@opentelemetry/instrumentation-fetch').FetchInstrumentationConfig;
 *  "@opentelemetry/instrumentation-long-task": import('@opentelemetry/instrumentation-long-task').LongtaskInstrumentationConfig;
 *  "@opentelemetry/instrumentation-user-interaction": import('@opentelemetry/instrumentation-user-interaction').UserInteractionInstrumentationConfig;
 *  "@opentelemetry/instrumentation-xml-http-request": import('@opentelemetry/instrumentation-xml-http-request').XMLHttpRequestInstrumentationConfig;
 *  "@opentelemetry/instrumentation-web-exception": import('@opentelemetry/instrumentation-web-exception').GlobalErrorsInstrumentationConfig;
 *  "@opentelemetry/instrumentation-web-vitals": import('@opentelemetry/instrumentation').InstrumentationConfig & import('./instrumentations/web-vitals.js').WebVitalsInstrumentationConfig
 * }} InstrumentationsConfigMap
 */

/**
 * @typedef {Object} EdotWebSdkConfig
 * @property {boolean} [disabled]
 * @property {string} [serviceName] // defaults to 'unknown_service:web'
 * @property {string} [serviceVersion] // defaults to undefined
 * @property {string} [logLevel] // defaults to 'info'
 * @property {number} [sampleRate] // defaults to 1
 * @property {string} [otlpEndpoint] // defaults to 'http://localhost:4318'
 * @property {Record<string, string>} [exportHeaders] // defaults to {}
 * @property {Record<string, import('./detector.js').AttributeValue>} [resourceAttributes] // defaults to {}
 * @property {InstrumentationsConfigMap} [instrumentations]
 */

/**
 * @param {EdotWebSdkConfig} config
 */
globalThis['startBrowserSdk'] = function startBrowserSdk(config) {
    const webSdk = WebSdkBuilder.with(TracesSdk)
        .with(MetricsSdk)
        .with(LogsSdk)
        .build();

    const bundleConfig = {
        instrumentations: [
            new DocumentLoadInstrumentation(
                config.instrumentations?.[
                    '@opentelemetry/instrumentation-document-load'
                ]
            ),
            new FetchInstrumentation(
                config.instrumentations?.[
                    '@opentelemetry/instrumentation-fetch'
                ]
            ),
            new LongTaskInstrumentation(
                config.instrumentations?.[
                    '@opentelemetry/instrumentation-long-task'
                ]
            ),
            new UserInteractionInstrumentation(
                config.instrumentations?.[
                    '@opentelemetry/instrumentation-user-interaction'
                ]
            ),
            new XMLHttpRequestInstrumentation(
                config.instrumentations?.[
                    '@opentelemetry/instrumentation-xml-http-request'
                ]
            ),
            new ExceptionInstrumentation(
                config.instrumentations?.[
                    '@opentelemetry/instrumentation-web-exception'
                ]
            ),
            new WebVitalsInstrumentation(
                config.instrumentations?.[
                    '@opentelemetry/instrumentation-web-vitals'
                ]
            ),
        ],
    };
    webSdk.init({...config, ...bundleConfig});
    return webSdk;
};
