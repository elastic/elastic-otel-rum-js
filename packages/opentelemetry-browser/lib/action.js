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
 *  attributes?: Record<string, string | number | boolean>
 * ) => void} addAction Records an app-defined event, such as a search or an
 *  add-to-cart. It is exported as a log event named `name`, with the given
 *  attributes and the usual session, user and page context.
 */

/** Longer names are rejected */
export const MAX_ACTION_NAME_LENGTH = 128;
/** Attributes beyond this count are ignored */
export const MAX_ACTION_ATTRIBUTES = 20;
/** Longer string values are truncated */
export const MAX_ACTION_VALUE_LENGTH = 1024;

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
                name.length > MAX_ACTION_NAME_LENGTH
            ) {
                diag.warn(
                    `addAction requires a name of 1 to ${MAX_ACTION_NAME_LENGTH} characters`
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
        if (
            key.length === 0 ||
            RESERVED_PREFIXES.some((p) => key.startsWith(p)) ||
            !isAttributeValue(value) ||
            count === MAX_ACTION_ATTRIBUTES
        ) {
            ignored.push(key);
            continue;
        }
        result[key] =
            typeof value === 'string' && value.length > MAX_ACTION_VALUE_LENGTH
                ? value.slice(0, MAX_ACTION_VALUE_LENGTH)
                : value;
        count++;
    }
    if (ignored.length > 0) {
        diag.warn(
            `addAction ignored invalid, reserved or extra attributes: ${ignored.join(', ')}`
        );
    }
    return result;
}

/**
 * @param {unknown} value
 * @returns {value is string | number | boolean}
 */
function isAttributeValue(value) {
    return (
        (typeof value === 'string' && value.length > 0) ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value))
    );
}
