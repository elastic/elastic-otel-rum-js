/**
 * @param {unknown} arr
 * @param {(item: unknown) => boolean} isValidItem
 * @returns
 */
export function isValidArray(arr: unknown, isValidItem: (item: unknown) => boolean): boolean;
/**
 * Returns a new URL with the path appended. Joins both parts with exactly one
 * slash, whether or not the URL pathname ends with one or the path starts with one.
 * @param {URL} url
 * @param {string} path
 */
export function appendPath(url: URL, path: string): URL;
