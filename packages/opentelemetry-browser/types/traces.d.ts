/**
 * @typedef {Object} TraceSdkConfig
 * @property {string} otlpEndpoint
 * @property {number} sampleRate
 * @property {Record<string, string>} exportHeaders
 * @property {import('@opentelemetry/resources').Resource} resource
 */
/**
 * @returns {import('./sdk.js').WebSdk<TraceSdkConfig>}
 */
export function TracesSdk(): import('./sdk.js').WebSdk<TraceSdkConfig>;
export type TraceSdkConfig = {
    otlpEndpoint: string;
    sampleRate: number;
    exportHeaders: Record<string, string>;
    resource: import('@opentelemetry/resources').Resource;
};
