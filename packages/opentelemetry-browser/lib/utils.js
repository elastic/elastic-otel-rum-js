/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Returns a new URL with the path appended. Avoiding double slash
 * @param {string} href
 * @param {string} path
 */
export function appendPath(href, path) {
    const result = new URL(href);
    result.pathname = (result.pathname + path).replace('//', '/');
    return result;
}
