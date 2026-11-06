/**
 * @param {unknown} arr
 * @param {(item: unknown) => boolean} isValidItem
 * @returns
 */
export function isValidArray(arr: unknown, isValidItem: (item: unknown) => boolean): boolean;
/**
 * Returns a new URL with the path appended. Avoiding double slash
 * @param {URL} url
 * @param {string} path
 */
export function appendPath(url: URL, path: string): URL;
/**
 * Resolves the export URL of each signal. A per-signal URL is used as is. Any
 * signal without one gets the signal path appended to the base `url`.
 * @param {{url?: string; tracesUrl?: string; logsUrl?: string; metricsUrl?: string}} [exportConfig]
 * @returns {{tracesUrl: string; logsUrl: string; metricsUrl: string}}
 * @throws {Error} when a value that is going to be used is not a valid URL
 */
export function resolveExportUrls(exportConfig?: {
    url?: string;
    tracesUrl?: string;
    logsUrl?: string;
    metricsUrl?: string;
}): {
    tracesUrl: string;
    logsUrl: string;
    metricsUrl: string;
};
