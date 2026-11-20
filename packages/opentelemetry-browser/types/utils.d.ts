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
/**
 * Resolves the export URL of each signal. A per-signal URL is used as is. Any
 * signal without one gets the signal path appended to the base `url`.
 * @param {{url?: string; tracesUrl?: string; logsUrl?: string}} [exportConfig]
 * @returns {{tracesUrl: string; logsUrl: string}}
 * @throws {Error} when a value that is going to be used is not a valid URL
 */
export function resolveExportUrls(exportConfig?: {
    url?: string;
    tracesUrl?: string;
    logsUrl?: string;
}): {
    tracesUrl: string;
    logsUrl: string;
};
