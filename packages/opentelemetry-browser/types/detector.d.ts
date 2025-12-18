/**
 * @typedef {Object} UserAgentData
 * @property {{brand: string; version: string}[]} brands
 * @property {string} platform
 */
/**
 * @template T
 * @typedef {T | Array<T | undefined | null>} MaybeArray<T>
 */
/**
 * @typedef {MaybeArray<number> | MaybeArray<boolean> | MaybeArray<string>} AttributeValue
 */
/**
 * @param {Record<string, AttributeValue>} attribs
 * @param {string | undefined} serviceName
 * @param {string | undefined} serviceVersion
 * @returns {import('@opentelemetry/resources').Resource}
 */
export function detectResource(attribs: Record<string, AttributeValue>, serviceName: string | undefined, serviceVersion: string | undefined): import('@opentelemetry/resources').Resource;
/**
 * We can always pull something like https://www.npmjs.com/package/ua-parser-js
 * but not for now.
 * @param {string} userAgent
 * @returns {{name: string; version: string} | undefined}
 */
export function getPlatformInfo(userAgent: string): {
    name: string;
    version: string;
} | undefined;
/**
 * @param {string} userAgent
 * @returns {{name: string; version: string} | undefined}
 */
export function getBrowserInfo(userAgent: string): {
    name: string;
    version: string;
} | undefined;
export type UserAgentData = {
    brands: {
        brand: string;
        version: string;
    }[];
    platform: string;
};
/**
 * <T>
 */
export type MaybeArray<T> = T | Array<T | undefined | null>;
export type AttributeValue = MaybeArray<number> | MaybeArray<boolean> | MaybeArray<string>;
