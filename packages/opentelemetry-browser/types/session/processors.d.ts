/** @typedef {import('./manager.js').SessionManager} SessionManager */
/** @typedef {import('@opentelemetry/sdk-trace').SpanProcessor} SpanProcessor */
/** @typedef {import('@opentelemetry/sdk-logs').LogRecordProcessor} LogRecordProcessor */
/**
 * @typedef {Object} SessionSpanProcessorOptions
 * @property {SessionManager} manager
 */
/**
 * Adds session attributes on span start.
 * @implements {SpanProcessor}
 */
export class SessionSpanProcessor implements SpanProcessor {
    /** @param {SessionSpanProcessorOptions} options */
    constructor(options: SessionSpanProcessorOptions);
    _manager: import("./manager.js").SessionManager;
    /**
     * @param {import('@opentelemetry/sdk-trace').Span} span
     */
    onStart(span: import("@opentelemetry/sdk-trace").Span): void;
    onEnd(): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
/**
 * @typedef {Object} SessionLogRecordProcessorOptions
 * @property {SessionManager} manager
 */
/**
 * Adds session attributes on log emit. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 * @implements {LogRecordProcessor}
 */
export class SessionLogRecordProcessor implements LogRecordProcessor {
    /** @param {SessionLogRecordProcessorOptions} options */
    constructor(options: SessionLogRecordProcessorOptions);
    _manager: import("./manager.js").SessionManager;
    /**
     * @param {import('@opentelemetry/sdk-logs').ReadWriteLogRecord} logRecord
     */
    onEmit(logRecord: import("@opentelemetry/sdk-logs").ReadWriteLogRecord): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
export type SessionManager = import("./manager.js").SessionManager;
export type SpanProcessor = import("@opentelemetry/sdk-trace").SpanProcessor;
export type LogRecordProcessor = import("@opentelemetry/sdk-logs").LogRecordProcessor;
export type SessionSpanProcessorOptions = {
    manager: SessionManager;
};
export type SessionLogRecordProcessorOptions = {
    manager: SessionManager;
};
