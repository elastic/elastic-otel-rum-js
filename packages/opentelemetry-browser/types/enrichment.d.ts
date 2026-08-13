/**
 * Current session + user attributes. Resource attrs are immutable after
 * provider start, so these are stamped on every span/log instead.
 *
 * @returns {Record<string, string | number>}
 */
export function currentSessionAttributes(): Record<string, string | number>;
/**
 * Span processor that refreshes session/user attributes on start (survives
 * session rotate without replacing the TracerProvider resource).
 */
export class SessionSpanProcessor {
    /**
     * @param {import('@opentelemetry/sdk-trace').Span} span
     * @param {import('@opentelemetry/api').Context} [_parentContext]
     */
    onStart(span: import('@opentelemetry/sdk-trace').Span, _parentContext?: import('@opentelemetry/api').Context): void;
    /**
     * @param {import('@opentelemetry/sdk-trace').ReadableSpan} [_span]
     */
    onEnd(_span?: import('@opentelemetry/sdk-trace').ReadableSpan): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
/**
 * Log processor that refreshes session/user attributes on emit.
 */
export class SessionLogProcessor {
    /**
     * @param {import('@opentelemetry/sdk-logs').SdkLogRecord} logRecord
     * @param {import('@opentelemetry/api').Context} [_context]
     */
    onEmit(logRecord: import('@opentelemetry/sdk-logs').SdkLogRecord, _context?: import('@opentelemetry/api').Context): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
