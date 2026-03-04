/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef {Object} BrowserSdk
 * @property {() => Promise<void>} shutdown
 * TODO: add more properties
 */
/**
 * @template T
 * @typedef {(config: T) => BrowserSdk} SdkBuilder<T>
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

    return function startSdk(cfg) {
        const signals = args.map(signalBuilder => signalBuilder(cfg));

        return {
            shutdown: () => Promise.all(signals.map(sdk => sdk.shutdown())).then(() => undefined),
        }
    }
}
