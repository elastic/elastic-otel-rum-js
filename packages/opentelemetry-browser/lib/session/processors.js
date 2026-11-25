/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {ATTR_SESSION_SEQUENCE} from '../semconv.js';
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
        span.setAttributes(sessionAttributes(this._manager, session));
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
     * @param {import('@opentelemetry/sdk-logs').ReadWriteLogRecord} logRecord
     */
    onEmit(logRecord) {
        const session = this._manager.getSession();
        logRecord.setAttributes(sessionAttributes(this._manager, session));
    }
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
    }
}

/**
 * @param {SessionManager} manager
 * @param {import('./state.js').SessionState | undefined} session
 */
function sessionAttributes(manager, session) {
    const attributes = sessionToAttributes(session, manager.getTabId());
    if (session) {
        const sequence = manager.nextSequence(session.id);
        if (sequence !== undefined) {
            attributes[ATTR_SESSION_SEQUENCE] = sequence;
        }
    }
    return attributes;
}
