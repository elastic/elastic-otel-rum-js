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
    constructor(listener: {
        requestStarted: (span: object) => void;
        requestEnded: (span: object) => void;
    });
    _listener: {
        requestStarted: (span: object) => void;
        requestEnded: (span: object) => void;
    };
    /** @param {{kind?: SpanKind}} span */
    onStart(span: {
        kind?: SpanKind;
    }): void;
    /** @param {{kind?: SpanKind}} span */
    onEnd(span: {
        kind?: SpanKind;
    }): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
import { SpanKind } from '@opentelemetry/api';
