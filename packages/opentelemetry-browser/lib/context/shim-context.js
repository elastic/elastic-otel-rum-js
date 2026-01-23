
import {context, ROOT_CONTEXT} from '@opentelemetry/api';

// use the diag one?
const logger = console.error.bind(console);

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


// shimmer wrap function
function wrap(nodule, name, wrapper) {
    if (!nodule || !nodule[name]) {
        logger('no original function ' + String(name) + ' to wrap');
        return;
    }

    if (!wrapper) {
        logger('no wrapper function');
        logger(new Error().stack);
        return;
    }

    const original = nodule[name];

    if (typeof original !== 'function' || typeof wrapper !== 'function') {
        logger('original object and wrapper must be functions');
        return;
    }

    const wrapped = wrapper(original, name);

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
function unwrap(nodule, name) {
    if (!nodule || !nodule[name]) {
        logger('no function to unwrap.');
        logger(new Error().stack);
        return;
    }

    const wrapped = nodule[name];
    if (!wrapped.__unwrap) {
        logger(
            `no original to unwrap to -- has ${String(name)} already been unwrapped?`
        );
    } else {
        wrapped.__unwrap();
        return;
    }
}

/**
 * @param {Function} fn 
 * @param {import('@opentelemetry/api').ContextManager} manager
 * @param {import('@opentelemetry/api').Context} context
 * @returns {Function}
 */
function bindFn(fn, manager, context) {
    const ctx = context || manager.active();
    function wrappedCtxFn(...args) {
        return manager.with(ctx, () => fn.apply(this, args));
    }
    Object.defineProperty(wrappedCtxFn, 'length', {
        enumerable: false,
        configurable: true,
        writable: false,
        value: fn.length,
    });
    return wrappedCtxFn;
}

// Only patching a couple of timeout funcs and Promise
let currentContext = ROOT_CONTEXT;

/** @type {import('@opentelemetry/api').ContextManager} */
export const PatcherContextManager = {
    active: function () {
        return currentContext;
    },
    with: function (context = ROOT_CONTEXT, fn, thisArg, ...args) {
        const prevContext = currentContext;
        try {
            return fn.call(thisArg, ...args);
        } finally {
            currentContext = prevContext;
        }
    },
    // @ts-ignore -- upstream types expects a generic type as return
    bind: function (context, target) {
        if (typeof target === 'function') {
            return bindFn(target, this, context);
        }
        return target;
    },
    enable: function () {
        const manager = this;
        wrap(window, 'setTimeout', (origSetTimeout) => {
            return function (...args) {
                args[0] = bindFn(args[0], manager, manager.active());
                return origSetTimeout.apply(this, args);
            }
        });
        wrap(window, 'setImmediate', (origSetImmediate) => {
            return function (...args) {
                args[0] = bindFn(args[0], manager, manager.active());
                return origSetImmediate.apply(this, args);
            }
        });
        if (window.Promise) {
            wrap(Promise.prototype, 'then', (origThen) => {
                return function (...args) {
                    args[0] = bindFn(args[0], manager, manager.active());
                    args[1] = bindFn(args[1], manager, manager.active());
                    return origThen.apply(this, args);
                }
            });
            wrap(Promise.prototype, 'catch', (origCatch) => {
                return function (...args) {
                    args[0] = bindFn(args[0], manager, manager.active());
                    return origCatch.apply(this, args);
                }
            });
        }
        return this;
    },
    disable: function () {
        unwrap(window, 'setTimeout');
        unwrap(window, 'setImmediate');
        if (window.Promise) {
            unwrap(Promise.prototype, 'then');
            unwrap(Promise.prototype, 'catch');
        }
        // TODO: patch XHR ???
        return this;
    },
};
