/**
 * @typedef {Object} LogsSdkConfig
 * @property {string} otlpEndpoint
 * @property {Record<string, string>} exportHeaders
 * @property {import('@opentelemetry/resources').Resource} resource
 */
/** @type {import('./sdk.js').WebSdk<LogsSdkConfig>} */
export const LogsSdk: import('./sdk.js').WebSdk<LogsSdkConfig>;
export type LogsSdkConfig = {
    otlpEndpoint: string;
    exportHeaders: Record<string, string>;
    resource: import('@opentelemetry/resources').Resource;
};
