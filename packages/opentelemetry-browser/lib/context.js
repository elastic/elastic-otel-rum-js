/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// This manager patches some async APIs to keep track of the context
// on the most common cases for web applications like when user performs
// an action and:
// - a timer is set
// - a fetch/XHR request is made
// - a Promise is chained with `then`, `catch` or `finally`

import {ROOT_CONTEXT} from '@opentelemetry/api';
import {createLogger} from './logging.js';

// use the diag one?
const logger = createLogger({logLevel: 'warn'});

// Keep the state of the current context here so only
// the manager has direct access.
let _currentContext = ROOT_CONTEXT;
let _managerEnabled = false;
/** @type {import('@opentelemetry/api').ContextManager} */
export const AsyncApisContextManager = {
    active: function () {
        return _currentContext;
    },
    with: function (context, fn, thisArg, ...args) {
        const prevContext = _currentContext;
        _currentContext = context || ROOT_CONTEXT;
        try {
            return fn.call(thisArg, ...args);
        } finally {
            _currentContext = prevContext;
        }
    },
    bind: function (context, target) {
        if (typeof target === 'function') {
            return bindFn(target, this, context);
        }
        return target;
    },
    enable: function () {
        if (_managerEnabled) {
            return this;
        }
        const manager = this;
        wrap(window, 'setTimeout', (origSetTimeout) => {
            /**
             * @this {any}
             * @param {...any} args
             * @returns {number}
             */
            return function (...args) {
                // Coerce the delay argument to number like the original function does.
                // ref: https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#non-number_delay_values_are_silently_coerced_into_numbers
                const delay = Number(args[1]);
                // Only carry the context if the delay is low enough. `NaN` is the same as `undefined`
                // and schedules the callback immediately. The max value (50) is arbitrary.
                if (isNaN(delay) || delay <= 50) {
                    args[0] = bindFn(args[0], manager, manager.active());
                }
                return origSetTimeout.apply(this, args);
            };
        });
        wrapXMLHttpRequest(manager);
        if (window.Promise) {
            wrapPromise(manager);
        }
        _currentContext = ROOT_CONTEXT;
        _managerEnabled = true;
        return manager;
    },
    disable: function () {
        if (_managerEnabled) {
            unwrap(window, 'setTimeout');
            unwrapXMLHttpRequest();
            if (window.Promise) {
                unwrapPromise();
            }
            _currentContext = ROOT_CONTEXT;
            _managerEnabled = false;
        }
        return this;
    },
};

// -- helper functions
/**
 * @typedef {(...args: any[]) => any} AnyFunction
 */

/**
 * @template F
 * @param {F} fn
 * @param {import('@opentelemetry/api').ContextManager} manager
 * @param {import('@opentelemetry/api').Context} context
 * @returns {F}
 */
function bindFn(fn, manager, context) {
    if (typeof fn !== 'function') {
        return fn;
    }

    const ctx = context || manager.active();
    /**
     * @this {any}
     * @param  {...any} args
     * @returns
     */
    function wrappedCtxFn(...args) {
        // @ts-expect-error - TS does not narrow te type to function
        return manager.with(ctx, () => fn.apply(this, args));
    }
    Object.defineProperty(wrappedCtxFn, 'length', {
        enumerable: false,
        configurable: true,
        writable: false,
        value: fn.length,
    });
    // @ts-expect-error - cannot cast here to generic
    return wrappedCtxFn;
}

/**
 * Wraps the promise constructor so any new promises carry
 * the context in their sbsequent calls to `.then` and `.catch`
 * @param {import('@opentelemetry/api').ContextManager} manager
 */
function wrapPromise(manager) {
    wrap(Promise.prototype, 'then', (origThen) => {
        /**
         * @this {Promise<any>}
         * @param {((value: any) => any) | null | undefined} onResolved
         * @param {((reason: any) => any) | null | undefined} onRejected
         * @returns {Promise<any>}
         */
        return function (onResolved, onRejected) {
            return origThen.call(
                this,
                bindFn(onResolved, manager, manager.active()),
                bindFn(onRejected, manager, manager.active())
            );
        };
    });
    wrap(Promise.prototype, 'catch', (origCatch) => {
        /**
         * @this {Promise<any>}
         * @param {((reason: any) => any) | null | undefined} onRejected
         * @returns {Promise<any>}
         */
        return function (onRejected) {
            return origCatch.call(
                this,
                bindFn(onRejected, manager, manager.active())
            );
        };
    });
    wrap(Promise.prototype, 'finally', (origFinally) => {
        /**
         * @this {Promise<any>}
         * @param {(() => any) | null | undefined} onCompleted
         * @returns {Promise<any>}
         */
        return function (onCompleted) {
            return origFinally.call(
                this,
                bindFn(onCompleted, manager, manager.active())
            );
        };
    });
}

function unwrapPromise() {
    unwrap(Promise.prototype, 'then');
    unwrap(Promise.prototype, 'catch');
    unwrap(Promise.prototype, 'finally');
}

const xhrProps = ['onreadystatechange'];
const xhrProto = globalThis.XMLHttpRequest.prototype;
const xhrTargetProps = [
    'onabort',
    'onerror',
    'onload',
    'onloadend',
    'onloadstart',
    'onprogress',
    'ontimeout',
];
const xhrTargetProto = globalThis.XMLHttpRequestEventTarget.prototype;
/**
 * We keep track of the event listeners on the same XHR instance that were
 * registered in a property named `__bound` so its easier to be cleared
 * and, therefore, garbage collected.
 * @param {import('@opentelemetry/api').ContextManager} manager
 */
function wrapXMLHttpRequest(manager) {
    // Wrap events
    wrap(xhrProto, 'addEventListener', function (origAEL) {
        /**
         * @this {XMLHttpRequest}
         * @param {...any} args
         */
        return function (...args) {
            /** @type {XMLHttpRequest & {__bound: undefined | Map<any, any>}} */
            // @ts-expect-error - we use extra porperties to handle state
            const xhr = this;
            if (typeof args[1] === 'function') {
                xhr.__bound = xhr.__bound || new Map();
                const handler = args[1];
                const bound = xhr.__bound.get(handler);
                args[1] = bound || bindFn(handler, manager, manager.active());
                xhr.__bound.set(handler, args[1]);
            }
            return origAEL.apply(xhr, args);
        };
    });
    wrap(xhrProto, 'removeEventListener', function (origREL) {
        /**
         * @this {XMLHttpRequest}
         * @param {...any} args
         */
        return function (...args) {
            /** @type {XMLHttpRequest & {__bound: undefined | Map<any, any>}} */
            // @ts-expect-error - we use extra porperties to handle state
            const xhr = this;
            if (typeof args[1] === 'function') {
                const handler = args[1];
                const bound = xhr.__bound?.get(handler);
                if (bound) {
                    args[1] = bound;
                    // NOTE: this handler might be registered more than once
                    // or for other event types so better to keep it in the map
                }
            }
            return origREL.apply(xhr, args);
        };
    });
    // Wrap on... properties of XMLHttpRequest.prototype
    for (const prop of xhrProps) {
        const descriptor = Object.getOwnPropertyDescriptor(xhrProto, prop);
        if (descriptor) {
            wrapDescriptor(descriptor, manager);
            Object.defineProperty(xhrProto, prop, descriptor);
        }
    }

    // Wrap onload, onerror, on... properties of XMLHttpRequestEventTarget.prototype
    for (const prop of xhrTargetProps) {
        const descriptor = Object.getOwnPropertyDescriptor(
            xhrTargetProto,
            prop
        );
        if (descriptor) {
            wrapDescriptor(descriptor, manager);
            Object.defineProperty(xhrTargetProto, prop, descriptor);
        }
    }
}

function unwrapXMLHttpRequest() {
    unwrap(xhrProto, 'addEventListener');
    unwrap(xhrProto, 'removeEventListener');
    // Unwrap onload, onerror, on... properties from:
    // - XMLHttpRequest.prototype
    // - XMLHttpRequestEventTarget.prototype
    for (const prop of xhrProps) {
        const descriptor = Object.getOwnPropertyDescriptor(xhrProto, prop);
        if (descriptor) {
            unwrap(descriptor, 'set');
            unwrap(descriptor, 'get');
            Object.defineProperty(xhrProto, prop, descriptor);
        }
    }
    for (const prop of xhrTargetProps) {
        const descriptor = Object.getOwnPropertyDescriptor(
            xhrTargetProto,
            prop
        );
        if (descriptor) {
            unwrap(descriptor, 'set');
            unwrap(descriptor, 'get');
            Object.defineProperty(xhrTargetProto, prop, descriptor);
        }
    }
}

// shimmer functions
/**
 * @template T
 * @typedef {{
 *   [K in keyof T]: T[K] extends ((...args: any[]) => any) | undefined ? K : never
 * }[keyof T]} FunctionKeys
 */
/**
 * @template T
 * @template {FunctionKeys<T>} K
 * @param {T} nodule
 * @param {K} name
 * @param {(orig: T[K], name: K) => T[K]} wrapper
 * @returns {T[K] | undefined}
 */
function wrap(nodule, name, wrapper) {
    if (!nodule || !nodule[name]) {
        logger.warn('no original function ' + String(name) + ' to wrap');
        return;
    }

    if (!wrapper) {
        logger.warn('no wrapper function', new Error().stack);
        return;
    }

    const original = nodule[name];

    if (typeof original !== 'function' || typeof wrapper !== 'function') {
        logger.warn('original object and wrapper must be functions');
        return;
    }

    /** @type {T[K] & {toString: () => string}} */
    // @ts-expect-error - toString is not in the type definition
    const wrapped = wrapper(original, name);
    // Some frameworks check the `toString` to check if the function is native
    if (typeof original.toString === 'function') {
        wrapped.toString = original.toString.bind(original);
    }

    defineProperty(wrapped, '__original', original);
    defineProperty(wrapped, '__unwrap', () => {
        if (nodule[name] === wrapped) {
            defineProperty(nodule, name, original);
        }
    });
    defineProperty(wrapped, '__wrapped', true);
    defineProperty(nodule, name, wrapped);
    return wrapped;
}

// shimmer unwrap function
/**
 * @template T
 * @template {FunctionKeys<T>} K
 * @param {T} nodule
 * @param {K} name
 * @returns {undefined}
 */
function unwrap(nodule, name) {
    if (!nodule || !nodule[name]) {
        logger.warn('no function to unwrap.', new Error().stack);
        return;
    }

    /** @type {T[K] & {__unwrap: () => void}} */
    // @ts-expect-error - accessing internal property
    const wrapped = nodule[name];
    if (!wrapped.__unwrap) {
        logger.warn(
            `no original to unwrap to -- has ${String(name)} already been unwrapped?`
        );
    } else {
        wrapped.__unwrap();
        return;
    }
}

/**
 *
 * @param {PropertyDescriptor} descriptor
 * @param {import('@opentelemetry/api').ContextManager} manager
 */
function wrapDescriptor(descriptor, manager) {
    wrap(descriptor, 'set', function (origSet) {
        return function (value) {
            if (typeof value === 'function') {
                const origValue = value;
                value = bindFn(origValue, manager, manager.active());
                value.__original = origValue;
            }
            // @ts-expect-error - this is of type any
            return origSet.call(this, value);
        };
    });
    wrap(descriptor, 'get', function (origGet) {
        return function () {
            // @ts-expect-error - this is of type any
            const value = origGet.call(this);
            if (typeof value === 'function' && value.__original) {
                return value.__original;
            }
            return value;
        };
    });
}

/**
 * Sets a property on an object, preserving its enumerability.
 * This function assumes that the property is already writable.
 * @param {any} obj
 * @param {string | number | symbol} name
 * @param {unknown} value
 */
function defineProperty(obj, name, value) {
    const enumerable =
        !!obj[name] && Object.prototype.propertyIsEnumerable.call(obj, name);

    Object.defineProperty(obj, name, {
        configurable: true,
        enumerable,
        writable: true,
        value,
    });
}
