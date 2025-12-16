/**
 * @typedef {Object} UserAgentData
 * @property {{brand: string; version: string}[]} brands
 * @property {string} platform
 */
/**
 * @param {Record<string, import('@opentelemetry/api').AttributeValue>} attribs
 * @param {string | undefined} serviceName
 * @param {string | undefined} serviceVersion
 * @returns {import('@opentelemetry/resources').Resource}
 */
export function detectResource(attribs: Record<string, import('@opentelemetry/api').AttributeValue>, serviceName: string | undefined, serviceVersion: string | undefined): import('@opentelemetry/resources').Resource;
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
