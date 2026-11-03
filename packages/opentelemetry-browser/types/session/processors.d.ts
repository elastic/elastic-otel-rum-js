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
export class SessionSpanProcessor implements SpanProcessor {
    /** @param {SessionSpanProcessorOptions} options */
    constructor(options: SessionSpanProcessorOptions);
    _manager: import("./manager.js").SessionManager;
    _processors: import("@opentelemetry/sdk-trace").SpanProcessor[];
    _sampledSpans: WeakSet<object>;
    /**
     * @param {import('@opentelemetry/sdk-trace').Span} span
     * @param {import('@opentelemetry/api').Context} ctx
     */
    onStart(span: import("@opentelemetry/sdk-trace").Span, ctx: import("@opentelemetry/api").Context): void;
    /** @param {import('@opentelemetry/sdk-trace').Span} span */
    onEnd(span: import("@opentelemetry/sdk-trace").Span): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
/**
 * Adds session attributes on log emit and lets only the records of sampled
 * sessions reach the wrapped processors. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 */
export class SessionLogRecordProcessor {
    /** @param {SessionLogRecordProcessorOptions} options */
    constructor(options: SessionLogRecordProcessorOptions);
    _manager: import("./manager.js").SessionManager;
    _processors: import("@opentelemetry/sdk-logs").LogRecordProcessor[];
    /**
     * @param {import('@opentelemetry/sdk-logs').SdkLogRecord} logRecord
     * @param {import('@opentelemetry/api').Context} [ctx]
     */
    onEmit(logRecord: import("@opentelemetry/sdk-logs").SdkLogRecord, ctx?: import("@opentelemetry/api").Context): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
export type SessionManager = import("./manager.js").SessionManager;
export type SpanProcessor = import("@opentelemetry/sdk-trace").SpanProcessor;
export type LogRecordProcessor = import("@opentelemetry/sdk-logs").LogRecordProcessor;
export type SessionSpanProcessorOptions = {
    manager: SessionManager;
    processors: SpanProcessor[];
};
export type SessionLogRecordProcessorOptions = {
    manager: SessionManager;
    processors: LogRecordProcessor[];
};
