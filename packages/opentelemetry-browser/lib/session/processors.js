/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {sessionToAttributes} from './state.js';

/** @typedef {import('./manager.js').SessionManager} SessionManager */
/** @typedef {import('@opentelemetry/sdk-trace').SpanProcessor} SpanProcessor */

/**
 * @typedef {Object} SessionSpanProcessorOptions
 * @property {SessionManager} manager
 */

/**
 * Adds session attributes on span start.
 * @implements {SpanProcessor}
 */
export class SessionSpanProcessor {
    /** @param {SessionSpanProcessorOptions} options */
    constructor(options) {
        this._manager = options.manager;
    }
    /**
     * @param {import('@opentelemetry/sdk-trace').Span} span
     */
    onStart(span) {
        const session = this._manager.getSession();
        span.setAttributes(
            sessionToAttributes(session, this._manager.getTabId())
        );
    }
    onEnd() {}
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
    }
}

/** @typedef {import('@opentelemetry/sdk-logs').LogRecordProcessor} LogRecordProcessor */
/**
 * @typedef {Object} SessionLogRecordProcessorOptions
 * @property {SessionManager} manager
 */
/**
 * Adds session attributes on log emit. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 * @implements {LogRecordProcessor}
 */
export class SessionLogRecordProcessor {
    /** @param {SessionLogRecordProcessorOptions} options */
    constructor(options) {
        this._manager = options.manager;
    }
    /**
     * @param {import('@opentelemetry/sdk-logs').SdkLogRecord} logRecord
     */
    onEmit(logRecord) {
        const session = this._manager.getSession();
        logRecord.setAttributes(
            sessionToAttributes(session, this._manager.getTabId())
        );
    }
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
    }
}
