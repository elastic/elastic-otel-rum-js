/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {sessionToAttributes} from './state.js';

/** @typedef {import('./manager.js').SessionManager} SessionManager */
/** @typedef {import('@opentelemetry/sdk-trace').SpanProcessor} SpanProcessor */
/** @typedef {import('@opentelemetry/sdk-logs').LogRecordProcessor} LogRecordProcessor */

/**
 * @typedef {Object} SessionSpanProcessorOptions
 * @property {SessionManager} manager
 * @property {SpanProcessor[]} processors
 */

/**
 * @typedef {Object} SessionLogRecordProcessorOptions
 * @property {SessionManager} manager
 * @property {LogRecordProcessor[]} processors
 */

/**
 * Adds session attributes on span start and lets only the spans of sampled
 * sessions reach the wrapped processors.
 * @implements {SpanProcessor}
 */
export class SessionSpanProcessor {
    /** @param {SessionSpanProcessorOptions} options */
    constructor(options) {
        this._manager = options.manager;
        this._processors = options.processors;
        this._sampledSpans = new WeakSet();
    }
    /**
     * @param {import('@opentelemetry/sdk-trace').Span} span
     * @param {import('@opentelemetry/api').Context} ctx
     */
    onStart(span, ctx) {
        const attributes = getSampledAttributes(this._manager);
        if (attributes) {
            span.setAttributes(attributes);
            for (const p of this._processors) {
                p.onStart(span, ctx);
            }
            // track which Spans have been sampled
            this._sampledSpans.add(span);
        }
    }
    /** @param {import('@opentelemetry/sdk-trace').Span} span */
    onEnd(span) {
        if (this._sampledSpans.has(span)) {
            for (const p of this._processors) {
                p.onEnd(span);
            }
            this._sampledSpans.delete(span);
        }
    }
    forceFlush() {
        return all(this._processors, (p) => p.forceFlush());
    }
    shutdown() {
        return all(this._processors, (p) => p.shutdown());
    }
}

/**
 * Adds session attributes on log emit and lets only the records of sampled
 * sessions reach the wrapped processors. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 */
export class SessionLogRecordProcessor {
    /** @param {SessionLogRecordProcessorOptions} options */
    constructor(options) {
        this._manager = options.manager;
        this._processors = options.processors;
    }
    /**
     * @param {import('@opentelemetry/sdk-logs').SdkLogRecord} logRecord
     * @param {import('@opentelemetry/api').Context} [ctx]
     */
    onEmit(logRecord, ctx) {
        const attributes = getSampledAttributes(this._manager);
        if (attributes) {
            logRecord.setAttributes(attributes);
            for (const p of this._processors) {
                p.onEmit(logRecord, ctx);
            }
        }
    }
    forceFlush() {
        return all(this._processors, (p) => p.forceFlush());
    }
    shutdown() {
        return all(this._processors, (p) => p.shutdown());
    }
}

/**
 * @param {SessionManager} manager
 * @returns {import('@opentelemetry/api').Attributes | undefined} the session
 *  attributes, or `undefined` when the telemetry must not be exported
 */
function getSampledAttributes(manager) {
    const session = manager.getSession();
    const sampled = session ? session.sampled : manager.exportsWithoutSession();
    return sampled
        ? sessionToAttributes(session, manager.getTabId())
        : undefined;
}

/**
 * @template P
 * @param {P[]} processors
 * @param {(processor: P) => Promise<void>} call
 * @returns {Promise<void>}
 */
function all(processors, call) {
    return Promise.all(processors.map(call)).then(() => undefined);
}
