/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {ExportResultCode} from '@opentelemetry/core';
import {DROP_ATTR, applyBeforeSend, isPaused} from './capture.js';

/**
 * @typedef {{export: Function, shutdown: Function, forceFlush?: Function}} DelegateExporter
 */

/**
 * Bounded retry with jitter on OTLP export failure (429/5xx surface as FAILED).
 */
export class RetryingExporter {
    /**
     * @param {DelegateExporter} delegate
     * @param {{maxRetries?: number, baseDelayMs?: number}} [opts]
     */
    constructor(delegate, opts = {}) {
        this._delegate = delegate;
        this._maxRetries = opts.maxRetries ?? 3;
        this._baseDelayMs = opts.baseDelayMs ?? 200;
    }

    /**
     * @param {unknown[]} items
     * @param {(result: {code: number, error?: Error}) => void} resultCallback
     */
    export(items, resultCallback) {
        const attempt = (/** @type {number} */ n) => {
            this._delegate.export(items, (/** @type {{code: number}} */ result) => {
                if (
                    result.code === ExportResultCode.SUCCESS ||
                    n >= this._maxRetries
                ) {
                    resultCallback(result);
                    return;
                }
                const delay =
                    this._baseDelayMs * 2 ** n * (0.5 + Math.random());
                setTimeout(() => attempt(n + 1), delay);
            });
        };
        attempt(0);
    }

    shutdown() {
        return this._delegate.shutdown();
    }

    forceFlush() {
        return this._delegate.forceFlush?.() ?? Promise.resolve();
    }
}

/**
 * Drop exports while capture is paused, and drop items marked by processors
 * or rejected by `capture.beforeSend`.
 */
export class GatedExporter {
    /**
     * @param {DelegateExporter} delegate
     * @param {'span'|'log'} kind
     */
    constructor(delegate, kind) {
        this._delegate = delegate;
        this._kind = kind;
    }

    /**
     * @param {Array<{attributes?: Record<string, unknown>}>} items
     * @param {(result: {code: number}) => void} resultCallback
     */
    export(items, resultCallback) {
        if (isPaused()) {
            resultCallback({code: ExportResultCode.SUCCESS});
            return;
        }
        const kept = items.filter((item) => {
            const attributes = item?.attributes ?? {};
            if (attributes[DROP_ATTR] === true) {
                return false;
            }
            return applyBeforeSend(this._kind, attributes);
        });
        if (kept.length === 0) {
            resultCallback({code: ExportResultCode.SUCCESS});
            return;
        }
        this._delegate.export(kept, resultCallback);
    }

    shutdown() {
        return this._delegate.shutdown();
    }

    forceFlush() {
        return this._delegate.forceFlush?.() ?? Promise.resolve();
    }
}

/**
 * @param {DelegateExporter} exporter
 * @param {'span'|'log'} [kind]
 * @returns {GatedExporter}
 */
export function wrapExporter(exporter, kind = 'span') {
    return new GatedExporter(new RetryingExporter(exporter), kind);
}
