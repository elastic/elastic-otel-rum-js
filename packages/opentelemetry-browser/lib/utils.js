/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Returns a new URL with the path appended. Avoiding double slash
 * @param {URL} url
 * @param {string} path
 */
export function appendPath(url, path) {
    const result = new URL(url.href);
    result.pathname = (result.pathname + path).replace('//', '/');
    return result;
}
