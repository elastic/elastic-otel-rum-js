/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { diag, DiagLogLevel } from '@opentelemetry/api';
import {registerInstrumentations} from '@opentelemetry/instrumentation';

import {createLogger} from './logging.js';

/**
 * @typedef {Object} BrowserSdkConfig
 * @property {boolean} [disabled]
 * @property {string} [serviceName]
 * @property {string} [serviceVersion]
 * @property {string} [logLevel] // defaults to 'info'
 * @property {number} [sampleRate] // defaults to 1
 * @property {string} [otlpEndpoint] // defaults to 'http://localhost:4318'
 * @property {Record<string, string>} [exportHeaders] // defaults to {}
 * @property {import('@opentelemetry/instrumentation').Instrumentation[]} [instrumentations] // defaults to []
 */
/**
 * @typedef {Object} BrowserSdk
 * @property {() => Promise<void>} shutdown
 * TODO: add more properties
 */
/**
 * @template T
 * @typedef {(config: T & BrowserSdkConfig) => BrowserSdk} SdkBuilder<T>
 */

/**
 * @typedef {Object} Signal
 * @property {() => Promise<void>} shutdown
 */
/**
 * @template T
 * @typedef {(config: T) => Signal} SignalBuilder<T>
 */

/**
 * @template S1
 * @template S2
 * @template S3
 * @param {SignalBuilder<S1>} firstSignalBuilder
 * @param {SignalBuilder<S2>} [secondSignalBuilder]
 * @param {SignalBuilder<S3>} [thirdSignalBuilder]
 * @returns {SdkBuilder<Parameters<SignalBuilder<S1>>[0] & Parameters<SignalBuilder<S2>>[0] & Parameters<SignalBuilder<S3>>[0]>}
 */
export function buildSdk(firstSignalBuilder, secondSignalBuilder, thirdSignalBuilder) {
    const args = [].slice.call(arguments);
    if (args.length === 0) {
        console.log('You need to pass at least one signal builder');
        return;
    }
    if (args.some(arg => typeof arg !== 'function')) {
        console.log('All signal builders need to be functions');
        return;
    }

    // To control multiple calls to `startBrowserSdk`
    let sdkStarted = false;
    /** @type {BrowserSdkConfig} */
    const defaultConfig = {
        logLevel: 'info',
        sampleRate: 1,
        serviceName: 'unknown_service:web',
        otlpEndpoint: 'http://localhost:4318',
        exportHeaders: {},
    };

    return function startSdk(cfg) {
        if (sdkStarted || cfg.disabled) {
            return;
        }
        const logLevel = cfg.logLevel ?? defaultConfig.logLevel;
        diag.setLogger(createLogger({logLevel}), {logLevel: DiagLogLevel.ALL});
        diag.debug(`Browser SDK intialization`, cfg);
    
        const config = {...defaultConfig, ...cfg};
    
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
        if (!Array.isArray(config.instrumentations) || config.instrumentations.length === 0) {
            diag.error(
                `The are no instrumentations defined in the configuration. SDK won't start.`
            );
            return;
        }
    
        const signals = args.map(signalBuilder => signalBuilder(config));
        registerInstrumentations({ instrumentations: config.instrumentations});

        sdkStarted = true;
        return {
            shutdown: () => Promise.all(signals.map(sdk => sdk.shutdown())).then(() => undefined),
        }
    }
}
