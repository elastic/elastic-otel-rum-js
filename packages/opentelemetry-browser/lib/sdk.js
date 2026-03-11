/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag, DiagLogLevel} from '@opentelemetry/api';
import {registerInstrumentations} from '@opentelemetry/instrumentation';

import {detectResource} from './detector.js';
import {createLogger} from './logging.js';

/**
 * @typedef {Object} RootConfig
 * @property {boolean} [disabled]
 * @property {string} [serviceName]
 * @property {string} [serviceVersion]
 * @property {string} [logLevel] // defaults to 'info'
 * @property {string} [otlpEndpoint] // defaults to 'http://localhost:4318'
 * @property {Record<string, import('./detector.js').AttributeValue>} [resourceAttributes] // defaults to {}
 * @property {import('@opentelemetry/instrumentation').Instrumentation[]} [instrumentations] // defaults to undefined
 */

/** @type {RootConfig} */
const defaultConfig = {
    logLevel: 'info',
    serviceName: 'unknown_service:web',
    otlpEndpoint: 'http://localhost:4318',
    resourceAttributes: {},
};

/**
 * @template T
 * @typedef {Object} WebSdk
 * @property {(config: T) => void} init
 * @property {() => Promise<void>} forceFlush
 */

/**
 * @template T
 * @typedef {Object} WebSdkBuilder
 * @property {<K>(sdk: WebSdk<K>) => WebSdkBuilder<T & Partial<K>>} with
 * @property {() => WebSdk<T>} build
 */

/**
 * @returns {WebSdkBuilder<RootConfig>}
 */
export function WebSdkBuilder() {
    /** @type {WebSdk<any>[]} */
    const _sdks = [];
    let _sdkStarted = false;

    return {
        with(sdk) {
            _sdks.push(sdk);
            return this;
        },
        build() {
            return {
                init(cfg) {
                    if (_sdkStarted || cfg.disabled) {
                        return;
                    }
                    const logLevel = cfg.logLevel ?? defaultConfig.logLevel;
                    diag.setLogger(createLogger({logLevel}), {
                        logLevel: DiagLogLevel.ALL,
                    });
                    diag.debug(`Browser SDK intialization`, cfg);

                    const config = {...defaultConfig, ...cfg};
                    const {
                        serviceName,
                        serviceVersion,
                        instrumentations,
                        resourceAttributes,
                    } = config;

                    // Input validation
                    /** @type {URL} */
                    let endpointUrl;
                    try {
                        endpointUrl = new URL(config.otlpEndpoint);
                    } catch (urlErr) {
                        diag.error(
                            `The value "${config.otlpEndpoint}" for "otlpEndpoint" configuration is not an URL. SDK won't start.`
                        );
                        return;
                    }
                    if (
                        !Array.isArray(instrumentations) ||
                        instrumentations.length === 0
                    ) {
                        diag.error(
                            'There "instrumentations" array of the configuration is empty or undefined.'
                        );
                        return;
                    }

                    // Detect resource and inject into config
                    const resource = detectResource(
                        resourceAttributes,
                        serviceName,
                        serviceVersion
                    );
                    // @ts-expect-error -- here TS does not know the extended configuration
                    config.resource = resource;

                    // Init the different SDKs and register instrumentations
                    for (const sdk of _sdks) {
                        sdk.init(config);
                    }
                    registerInstrumentations({instrumentations});
                    _sdkStarted = true;
                },
                forceFlush() {
                    return Promise.all(
                        _sdks.map((sdk) => sdk.forceFlush())
                    ).then(() => {});
                },
            };
        },
    };
}
