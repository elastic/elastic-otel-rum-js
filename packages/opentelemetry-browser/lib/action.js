/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

import {ATTR_URL_FULL} from './semconv.js';

/**
 * @typedef {Object} ActionApi
 * @property {(
 *  name: string,
 *  attributes?: Record<string, ActionAttributeValue>
 * ) => void} addAction Records an app-defined event, such as a search or an
 *  add-to-cart. It is exported as a log event named `name`, with the given
 *  attributes and the usual session, user and page context.
 */

/** @typedef {string | number | boolean | string[] | number[] | boolean[]} ActionAttributeValue */

/** Longer names are rejected */
export const MAX_ACTION_NAME_LENGTH = 128;
/** Attributes beyond this count are ignored */
export const MAX_ACTION_ATTRIBUTES = 20;
/** Longer string values are truncated */
export const MAX_ACTION_VALUE_LENGTH = 1024;
/** Array values are cut to this many items */
export const MAX_ACTION_ARRAY_LENGTH = 20;

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

// Set by the SDK, apps can't override them
const RESERVED_PREFIXES = ['session.', 'user.', 'url.', 'elastic.', 'event.'];

/**
 * Public API returned by `startBrowserSdk`. Without a logger (SDK disabled or
 * failed to start) `addAction` is a no-op.
 * @param {import('@opentelemetry/api-logs').Logger | undefined} logger
 * @param {() => string | undefined} [getHref] returns the current page URL
 * @returns {ActionApi}
 */
export function createActionApi(
    logger,
    getHref = () => globalThis.location?.href
) {
    return {
        addAction(name, attributes) {
            if (!logger) {
                return;
            }
            if (
                typeof name !== 'string' ||
                name.length === 0 ||
                name.length > MAX_ACTION_NAME_LENGTH ||
                CONTROL_CHARS.test(name)
            ) {
                diag.warn(
                    `addAction requires a name of 1 to ${MAX_ACTION_NAME_LENGTH} characters without control characters`
                );
                return;
            }
            try {
                // Respects the session sampling decision
                if (logger.enabled?.() === false) {
                    return;
                }
                const attrs = sanitizeAttributes(attributes);
                const href = getHref();
                if (href) {
                    attrs[ATTR_URL_FULL] = href;
                }
                logger.emit({eventName: name, attributes: attrs});
            } catch (err) {
                diag.warn(`addAction failed: ${err}`);
            }
        },
    };
}

/**
 * Keeps valid attributes, up to the limits. Warns about the ignored ones by
 * key only since values may be personal data.
 * @param {unknown} attributes
 * @returns {import('@opentelemetry/api').Attributes}
 */
function sanitizeAttributes(attributes) {
    /** @type {import('@opentelemetry/api').Attributes} */
    const result = {};
    if (attributes === undefined || attributes === null) {
        return result;
    }
    if (typeof attributes !== 'object' || Array.isArray(attributes)) {
        diag.warn('addAction ignored attributes: it must be an object');
        return result;
    }

    /** @type {string[]} */
    const ignored = [];
    let count = 0;
    for (const [key, value] of Object.entries(attributes)) {
        const normalized =
            key.length === 0 || isReserved(key)
                ? undefined
                : normalizeValue(value);
        if (normalized === undefined || count === MAX_ACTION_ATTRIBUTES) {
            ignored.push(key);
            continue;
        }
        result[key] = normalized;
        count++;
    }
    if (ignored.length > 0) {
        diag.warn(
            `addAction ignored invalid, reserved or extra attributes: ${ignored.join(', ')}`
        );
    }
    return result;
}

/** @param {string} key */
function isReserved(key) {
    const lower = key.toLowerCase();
    return RESERVED_PREFIXES.some((p) => lower.startsWith(p));
}

/**
 * Returns a copy that is safe to export, or undefined if the value is not
 * valid. Arrays must be homogeneous, as OpenTelemetry requires.
 * @param {unknown} value
 * @returns {ActionAttributeValue | undefined}
 */
function normalizeValue(value) {
    if (!Array.isArray(value)) {
        return normalizeScalar(value);
    }
    const items = value.slice(0, MAX_ACTION_ARRAY_LENGTH).map(normalizeScalar);
    if (
        items.length === 0 ||
        items.some((i) => i === undefined || typeof i !== typeof items[0])
    ) {
        return undefined;
    }
    return /** @type {ActionAttributeValue} */ (items);
}

/**
 * @param {unknown} value
 * @returns {string | number | boolean | undefined}
 */
function normalizeScalar(value) {
    if (typeof value === 'string' && value.length > 0) {
        return value.length > MAX_ACTION_VALUE_LENGTH
            ? value.slice(0, MAX_ACTION_VALUE_LENGTH)
            : value;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    return undefined;
}
