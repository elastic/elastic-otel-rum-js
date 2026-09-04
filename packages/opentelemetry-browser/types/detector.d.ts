/**
 * @typedef {Object} UserAgentData
 * @property {{brand: string; version: string}[]} brands
 * @property {string} platform
 */
/**
 * @param {import('@opentelemetry/api').Attributes} attribs
 * @param {string | undefined} serviceName
 * @param {string | undefined} serviceVersion
 * @returns {import('@opentelemetry/api').Attributes}
 */
export function detectResource(attribs: import("@opentelemetry/api").Attributes, serviceName: string | undefined, serviceVersion: string | undefined): import("@opentelemetry/api").Attributes;
/**
 * @param {string} userAgent
 * @returns {{name: string; version: string | undefined} | undefined}
 */
export function getPlatformInfo(userAgent: string): {
    name: string;
    version: string | undefined;
} | undefined;
/**
 * @param {string} userAgent
 * @returns {{name: string; version: string | undefined} | undefined}
 */
export function getBrowserInfo(userAgent: string): {
    name: string;
    version: string | undefined;
} | undefined;
export type UserAgentData = {
    brands: {
        brand: string;
        version: string;
    }[];
    platform: string;
};
