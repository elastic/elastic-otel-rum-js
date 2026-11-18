/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {SpanKind} from '@opentelemetry/api';

/**
 * Tells the detector about requests through the spans of the fetch and XHR
 * instrumentations: a request start is a reaction, so a slow response is not
 * a dead click, and an error once it responds is an error click.
 */
export class RequestSpanProcessor {
    /**
     * @param {{
     *  requestStarted: (span: object) => void,
     *  requestEnded: (span: object) => void,
     * }} listener
     */
    constructor(listener) {
        this._listener = listener;
    }
    /** @param {{kind?: SpanKind}} span */
    onStart(span) {
        if (span.kind === SpanKind.CLIENT) {
            this._listener.requestStarted(span);
        }
    }
    /** @param {{kind?: SpanKind}} span */
    onEnd(span) {
        if (span.kind === SpanKind.CLIENT) {
            this._listener.requestEnded(span);
        }
    }
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
    }
}
