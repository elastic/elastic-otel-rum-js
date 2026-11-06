/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @param {unknown} arr
 * @param {(item: unknown) => boolean} isValidItem
 * @returns
 */
export function isValidArray(arr, isValidItem) {
    if (Array.isArray(arr)) {
        return arr.every(isValidItem);
    }
    return false;
}

/**
 * Returns a new URL with the path appended. Joins both parts with exactly one
 * slash, whether or not the URL pathname ends with one or the path starts with one.
 * @param {URL} url
 * @param {string} path
 */
export function appendPath(url, path) {
    const result = new URL(url.href);
    result.pathname = `${result.pathname.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    return result;
}
