/**
 * @typedef {Object} MetricsConfig
 * @property {string} otlpEndpoint
 * @property {Record<string, string>} exportHeaders
 * @property {import('@opentelemetry/resources').Resource} resource
 */
/**
 * @returns {import('./sdk.js').WebSdk<MetricsConfig>}
 */
export function MetricsSdk(): import('./sdk.js').WebSdk<MetricsConfig>;
export type MetricsConfig = {
    otlpEndpoint: string;
    exportHeaders: Record<string, string>;
    resource: import('@opentelemetry/resources').Resource;
};
