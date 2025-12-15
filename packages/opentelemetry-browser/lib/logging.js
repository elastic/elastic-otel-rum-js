/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiagLogLevel } from '@opentelemetry/api';

let _logLevel = DiagLogLevel.INFO;
const logLevelMap = {
    ALL: DiagLogLevel.ALL,
    VERBOSE: DiagLogLevel.VERBOSE,
    DEBUG: DiagLogLevel.DEBUG,
    INFO: DiagLogLevel.INFO,
    WARN: DiagLogLevel.WARN,
    ERROR: DiagLogLevel.ERROR,
    NONE: DiagLogLevel.NONE,
};

/**
 * TODO: luggite like?
 * @param {Object} config 
 * @param {string} config.logLevel
 * @returns {import('@opentelemetry/api').DiagLogger}
 */
export function createLogger(config) {
    _logLevel = logLevelMap[config.logLevel.toUpperCase()];

    if (_logLevel == null) {
        console.warn(`Unknown log level "${config.logLevel}", expected one of ${Object.keys(logLevelMap)}, using default`)
        _logLevel = logLevelMap.INFO;
    }

    return {
        error: makeLogFunction(logLevelMap.ERROR, console.error.bind(console)),
        warn: makeLogFunction(logLevelMap.WARN, console.error.bind(console)),
        info: makeLogFunction(logLevelMap.INFO, console.log.bind(console)),
        debug: makeLogFunction(logLevelMap.DEBUG, console.log.bind(console)),
        verbose: makeLogFunction(logLevelMap.VERBOSE, console.trace.bind(console)),
    };
}

/**
 * Build a log emitter function for level minLevel. I.e. this is the
 * creator of `log.info`, `log.error`, etc.
 *
 * @param {number} minLevel
 * @param {(...args: any[]) => void} emitFn
 * @returns {function(...any): void}
 */
function makeLogFunction(minLevel, emitFn) {
    return function LOG(...args) {
        const shouldLog = _logLevel >= minLevel;
        if (args.length === 0) {
            // `log.<level>()`
            return shouldLog;
        }

        if (shouldLog) {
            emitFn(...args);
        }
    };
}
