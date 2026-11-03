/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

import {
    ATTR_ELASTIC_USER_ACCOUNT,
    ATTR_ELASTIC_USER_ATTRIBUTES_PREFIX,
    ATTR_USER_EMAIL,
    ATTR_USER_FULL_NAME,
    ATTR_USER_ID,
} from './semconv.js';

/** @typedef {import('@opentelemetry/sdk-trace').SpanProcessor} SpanProcessor */

/**
 * @typedef {Object} UserIdentity
 * @property {string} id
 * @property {string} [email]
 * @property {string} [name]
 * @property {string} [account]
 * @property {Record<string, string | number | boolean>} [attributes] Custom
 *  attributes, added with the `elastic.user.attributes.` prefix.
 */

/**
 * @typedef {Object} UserApi
 * @property {(user: UserIdentity) => void} setUser
 * @property {() => void} clearUser
 */

/** Custom attributes beyond this count are ignored */
export const MAX_USER_ATTRIBUTES = 20;
/** Longer string values are truncated, `id` excepted */
export const MAX_USER_VALUE_LENGTH = 256;

const NO_ATTRIBUTES = Object.freeze({});

/**
 * Holds the identity of the current end-user. It is applied to spans and log
 * records by the processors below, so it can change at any time (for example
 * on login or logout), unlike resource attributes.
 */
export class UserManager {
    constructor() {
        /** @type {import('@opentelemetry/api').Attributes} */
        this._attributes = NO_ATTRIBUTES;
    }

    /**
     * Replaces the current identity. Requires a non-empty `id`. Invalid
     * optional fields, invalid custom attributes and custom attributes beyond
     * {@link MAX_USER_ATTRIBUTES} are ignored with a warning. Strings other
     * than `id` are truncated to {@link MAX_USER_VALUE_LENGTH} characters.
     * @param {UserIdentity} user
     */
    setUser(user) {
        if (!user || typeof user !== 'object' || !isNonEmptyString(user.id)) {
            diag.warn('setUser requires a non-empty string "id"');
            return;
        }
        /** @type {import('@opentelemetry/api').Attributes} */
        const attributes = {[ATTR_USER_ID]: user.id};
        /** @type {string[]} */
        const ignored = [];
        const optional = /** @type {const} */ ([
            ['email', ATTR_USER_EMAIL],
            ['name', ATTR_USER_FULL_NAME],
            ['account', ATTR_ELASTIC_USER_ACCOUNT],
        ]);
        for (const [key, attr] of optional) {
            const value = user[key];
            if (isNonEmptyString(value)) {
                attributes[attr] = truncate(value);
            } else if (value !== undefined) {
                ignored.push(key);
            }
        }

        const custom = user.attributes;
        if (custom !== undefined) {
            if (
                !custom ||
                typeof custom !== 'object' ||
                Array.isArray(custom)
            ) {
                ignored.push('attributes');
            } else {
                let count = 0;
                for (const [key, value] of Object.entries(custom)) {
                    if (
                        key.length === 0 ||
                        !isAttributeValue(value) ||
                        count === MAX_USER_ATTRIBUTES
                    ) {
                        ignored.push(`attributes.${key}`);
                        continue;
                    }
                    attributes[ATTR_ELASTIC_USER_ATTRIBUTES_PREFIX + key] =
                        typeof value === 'string' ? truncate(value) : value;
                    count++;
                }
            }
        }

        if (ignored.length > 0) {
            // Only keys: values may be personal data
            diag.warn(
                `setUser ignored invalid or extra fields: ${ignored.join(', ')}`
            );
        }
        // Frozen since the same object is handed to every span and log record
        this._attributes = Object.freeze(attributes);
    }

    /** Removes the identity set with {@link UserManager.setUser}. */
    clearUser() {
        this._attributes = NO_ATTRIBUTES;
    }

    /** @returns {import('@opentelemetry/api').Attributes} */
    getAttributes() {
        return this._attributes;
    }
}

/**
 * Public API returned by `startBrowserSdk`. Without a manager (SDK disabled
 * or failed to start) both methods are no-ops.
 * @param {UserManager | undefined} manager
 * @returns {UserApi}
 */
export function createUserApi(manager) {
    return {
        setUser: (user) => manager?.setUser(user),
        clearUser: () => manager?.clearUser(),
    };
}

/**
 * Adds user attributes on span start.
 * @implements {SpanProcessor}
 */
export class UserSpanProcessor {
    /** @param {UserManager} manager */
    constructor(manager) {
        this._manager = manager;
    }
    /** @param {import('@opentelemetry/sdk-trace').Span} span */
    onStart(span) {
        span.setAttributes(this._manager.getAttributes());
    }
    onEnd() {}
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
    }
}

/**
 * Adds user attributes on log emit. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 */
export class UserLogRecordProcessor {
    /** @param {UserManager} manager */
    constructor(manager) {
        this._manager = manager;
    }
    /** @param {{setAttributes: (attrs: import('@opentelemetry/api').Attributes) => unknown}} logRecord */
    onEmit(logRecord) {
        logRecord.setAttributes(this._manager.getAttributes());
    }
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
    }
}

// -- helper functions

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isNonEmptyString(value) {
    return typeof value === 'string' && value.length > 0;
}

/**
 * Same rule as the fixed fields for strings: empty ones are dropped.
 * @param {unknown} value
 * @returns {value is string | number | boolean}
 */
function isAttributeValue(value) {
    return (
        isNonEmptyString(value) ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value))
    );
}

/** @param {string} value */
function truncate(value) {
    return value.length > MAX_USER_VALUE_LENGTH
        ? value.slice(0, MAX_USER_VALUE_LENGTH)
        : value;
}
