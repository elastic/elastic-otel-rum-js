/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {SpanKind} from '@opentelemetry/api';

/**
 * Tells the detector about requests through the spans of the fetch and XHR
 * instrumentations, or manual ones: a request start is a reaction, so a slow
 * response is not a dead click, and an error once it responds is an error
 * click.
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
        if (isRequest(span)) {
            this._listener.requestStarted(span);
        }
    }
    /** @param {{kind?: SpanKind}} span */
    onEnd(span) {
        if (isRequest(span)) {
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

/**
 * Producer spans start an operation too, such as sending a message.
 * @param {{kind?: SpanKind}} span
 */
function isRequest(span) {
    return span.kind === SpanKind.CLIENT || span.kind === SpanKind.PRODUCER;
}
