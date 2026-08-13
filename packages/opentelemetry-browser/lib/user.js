/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

/**
 * @typedef {{id: string, email?: string, name?: string}} UserIdentity
 */

/** @type {UserIdentity | null} */
let _user = null;

/**
 * Stamp the current end-user on subsequent traces and logs (`user.id` /
 * `user.email` / `user.name`). Requires `id`.
 *
 * @param {UserIdentity} user
 * @returns {void}
 */
export function setUser(user) {
    if (!user || typeof user.id !== 'string' || user.id.length === 0) {
        diag.warn('setUser requires a non-empty {id}');
        return;
    }
    _user = {
        id: user.id,
        email: typeof user.email === 'string' ? user.email : undefined,
        name: typeof user.name === 'string' ? user.name : undefined,
    };
}

/** Clear identity attributes previously set with {@link setUser}. */
export function clearUser() {
    _user = null;
}

/** @returns {UserIdentity | null} */
export function getUser() {
    return _user;
}

/**
 * Resource/span/log attributes for the current user, or `{}` if none.
 *
 * @returns {Record<string, string>}
 */
export function getUserAttributes() {
    if (!_user) {
        return {};
    }
    /** @type {Record<string, string>} */
    const attrs = {'user.id': _user.id};
    if (_user.email) {
        attrs['user.email'] = _user.email;
    }
    if (_user.name) {
        attrs['user.name'] = _user.name;
    }
    return attrs;
}
