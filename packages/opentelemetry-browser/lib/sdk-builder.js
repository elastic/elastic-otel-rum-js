/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * @template T
 * @typedef {(config: T) => any} SignalFn<T>
 */
/**
 * @template S1
 * @overload
 * @param {SignalFn<S1>} firstSignal
 * @param {Parameters<SignalFn<S1>>[0]} cfg
 * @returns {void}
 */
/**
 * @template S1
 * @template S2
 * @overload
 * @param {SignalFn<S1>} firstSignal
 * @param {SignalFn<S2>} secondSignal
 * @param {Parameters<SignalFn<S1>>[0] & Parameters<SignalFn<S2>>[0]} cfg
 * @returns {void}
 */
/**
 * @template S1
 * @template S2
 * @template S3
 * @overload
 * @param {SignalFn<S1>} firstSignal
 * @param {SignalFn<S2>} secondSignal
 * @param {SignalFn<S3>} thirdSignal
 * @param {Parameters<SignalFn<S1>>[0] & Parameters<SignalFn<S2>>[0] & Parameters<SignalFn<S3>>[0]} cfg
 * @returns {void}
 */
export function setupSdk(...args) {
    if (args.length < 2) {
        console.log('Not enoguh arguments');
        return;
    }
    const cfg = args.pop();
    if (typeof cfg !== 'object') {
        console.log('Last argument is not an object');
        return;
    }
    if (args.some(arg => typeof arg !== 'function')) {
        console.log('wrong signal funtion arguments');
        return;
    }

    const signals = args.map(signalFn => signalFn(cfg));
    return {
        shutdown: () => Promise.all(signals.map(sdk => sdk.shutdown())),
    }
}
