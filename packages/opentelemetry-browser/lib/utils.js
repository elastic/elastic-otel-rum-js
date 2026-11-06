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
 * Returns a new URL with the path appended. Avoiding double slash
 * @param {URL} url
 * @param {string} path
 */
export function appendPath(url, path) {
    const result = new URL(url.href);
    result.pathname = (result.pathname + path).replace('//', '/');
    return result;
}
