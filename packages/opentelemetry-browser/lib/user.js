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

/**
 * Holds the identity of the current end-user. It is applied to spans and log
 * records by the processors below, so it can change at any time (for example
 * on login or logout), unlike resource attributes.
 */
export class UserManager {
    constructor() {
        /** @type {import('@opentelemetry/api').Attributes} */
        this._attributes = {};
    }

    /**
     * Replaces the current identity. Requires a non-empty `id`; optional
     * fields that are not non-empty strings are ignored. Entries of
     * `attributes` must have a non-empty key and a string, finite number or
     * boolean value, others are ignored.
     * @param {UserIdentity} user
     */
    setUser(user) {
        if (!user || typeof user.id !== 'string' || user.id.length === 0) {
            diag.warn('setUser requires a non-empty string "id"');
            return;
        }
        /** @type {import('@opentelemetry/api').Attributes} */
        const attributes = {[ATTR_USER_ID]: user.id};
        const optional = /** @type {const} */ ([
            ['email', ATTR_USER_EMAIL],
            ['name', ATTR_USER_FULL_NAME],
            ['account', ATTR_ELASTIC_USER_ACCOUNT],
        ]);
        for (const [key, attr] of optional) {
            const value = user[key];
            if (typeof value === 'string' && value.length > 0) {
                attributes[attr] = value;
            }
        }
        if (user.attributes && typeof user.attributes === 'object') {
            for (const [key, value] of Object.entries(user.attributes)) {
                if (
                    key.length > 0 &&
                    (typeof value === 'string' ||
                        typeof value === 'boolean' ||
                        (typeof value === 'number' && Number.isFinite(value)))
                ) {
                    attributes[ATTR_ELASTIC_USER_ATTRIBUTES_PREFIX + key] =
                        value;
                }
            }
        }
        this._attributes = attributes;
    }

    /** Removes the identity set with {@link UserManager.setUser}. */
    clearUser() {
        this._attributes = {};
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
