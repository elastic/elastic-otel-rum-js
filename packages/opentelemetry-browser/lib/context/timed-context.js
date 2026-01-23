/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {createContextKey} from '@opentelemetry/api';

// use the diag one?
const logger = console.error.bind(console);


// From upstream core
const SUPPRESS_TRACING_KEY = createContextKey(
    'OpenTelemetry SDK Context Key SUPPRESS_TRACING'
);
// From upstream api
const SPAN_KEY = createContextKey('OpenTelemetry Context Key SPAN');
const BAGGAGE_KEY = createContextKey('OpenTelemetry Baggage Key');
const VAL_TRESHOLD = 300;

/**@type {Map<symbol, {value: any, expires: number}>} */
const contextMap = new Map();
/**@type {import('@opentelemetry/api').Context} */
const TimedContext = {
    getValue: function (key) {
        const entry = contextMap.get(key);
        let result;
        if (entry) {
            const {value, expires} = entry;
            // Spans should return if not ended regardless of the expiration
            if (key === SPAN_KEY) {
                return value.ended ? undefined : value;
            }
            // Suppress tracing expires
            if (key === SUPPRESS_TRACING_KEY) {
                return performance.now() > expires ? undefined : value;
            }
            result = value;
        }
        return result;
    },
    setValue: function (key, value) {
        const expires = performance.now() + VAL_TRESHOLD;
        contextMap.set(key, {value, expires});
        return this;
    },
    deleteValue: function (key) {
        contextMap.delete(key);
        return this;
    },
};

/** @type {import('@opentelemetry/api').ContextManager} */
export const TimedContextManager = {
    active: function () {
        return TimedContext;
    },
    with: function (context, fn, thisArg, ...args) {
        return fn.call(thisArg, ...args);
    },
    bind: function (context, target) {
        return target;
    },
    enable: function () {
        return this;
    },
    disable: function () {
        return this;
    },
};
