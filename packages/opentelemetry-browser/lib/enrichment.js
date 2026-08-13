/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {context, trace} from '@opentelemetry/api';
import {getSessionId, getSessionSequence} from './session.js';
import {getUserAttributes} from './user.js';
import {currentDeviceAttributes} from './device.js';
import {
    DROP_ATTR,
    currentPageAttributes,
    lastActionAttributes,
    matchesIgnoreUrl,
    serializeRejection,
} from './capture.js';
import {
    lookupResourceTiming,
    resourceTimingAttributes,
    urlFromAttributes,
} from './timing.js';

/**
 * Current session + user + device + page attributes. Resource attrs are
 * immutable after provider start, so these are stamped on every span/log.
 *
 * @returns {Record<string, string | number>}
 */
export function currentSessionAttributes() {
    const sessionId = getSessionId() ?? '';
    return {
        'session.id': sessionId,
        'rum.sessionId': sessionId,
        'session.sequence': getSessionSequence(),
        ...getUserAttributes(),
        ...currentDeviceAttributes(),
        ...currentPageAttributes(),
        ...lastActionAttributes(),
    };
}

/**
 * Span processor that refreshes session/user attributes on start (survives
 * session rotate without replacing the TracerProvider resource).
 */
export class SessionSpanProcessor {
    /**
     * @param {import('@opentelemetry/sdk-trace').Span} span
     * @param {import('@opentelemetry/api').Context} [_parentContext]
     */
    onStart(span, _parentContext) {
        span.setAttributes(currentSessionAttributes());
        const url = urlFromAttributes(
            /** @type {Record<string, unknown>} */ (span.attributes ?? {})
        );
        if (url && matchesIgnoreUrl(url)) {
            span.setAttribute(DROP_ATTR, true);
        }
    }

    /**
     * @param {import('@opentelemetry/sdk-trace').ReadableSpan} span
     */
    onEnd(span) {
        const attributes =
            /** @type {Record<string, unknown>} */ (span.attributes ?? {});
        const url = urlFromAttributes(attributes);
        if (url && matchesIgnoreUrl(url)) {
            try {
                attributes[DROP_ATTR] = true;
            } catch {
                // attributes may be frozen after end
            }
            return;
        }

        if (isHttpSpan(span.name, attributes) && attributes['http.queue.duration'] == null) {
            const entry = lookupResourceTiming(url);
            if (entry) {
                try {
                    Object.assign(attributes, resourceTimingAttributes(entry));
                } catch {
                    // attributes may be frozen after end
                }
            }
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
 * Log processor that refreshes session/user attributes on emit.
 */
export class SessionLogProcessor {
    /**
     * @param {import('@opentelemetry/sdk-logs').SdkLogRecord} logRecord
     * @param {import('@opentelemetry/api').Context} [_context]
     */
    onEmit(logRecord, _context) {
        logRecord.setAttributes(currentSessionAttributes());
        const attributes =
            /** @type {Record<string, unknown>} */ (logRecord.attributes ?? {});
        const url = urlFromAttributes(attributes);
        if (url && matchesIgnoreUrl(url)) {
            logRecord.setAttribute(DROP_ATTR, true);
            return;
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
 * @param {string} name
 * @param {Record<string, unknown>} attributes
 */
function isHttpSpan(name, attributes) {
    return (
        name === 'resourceFetch' ||
        name === 'documentFetch' ||
        typeof attributes['http.request.method'] === 'string' ||
        typeof attributes['http.url'] === 'string' ||
        typeof attributes['url.full'] === 'string'
    );
}

/**
 * Extra exception-log attributes: active trace, and a usable message for
 * non-Error promise rejections.
 *
 * @param {unknown} error
 * @returns {Record<string, string>}
 */
export function exceptionAttributes(error) {
    /** @type {Record<string, string>} */
    const attrs = {};
    const span = trace.getSpan(context.active());
    if (span) {
        const spanContext = span.spanContext();
        attrs['trace.id'] = spanContext.traceId;
        attrs['span.id'] = spanContext.spanId;
    }
    if (error && typeof error !== 'string' && !(error instanceof Error)) {
        attrs['exception.type'] = 'UnhandledRejection';
        attrs['exception.message'] = serializeRejection(error);
    }
    return attrs;
}
