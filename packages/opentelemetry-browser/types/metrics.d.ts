/** @type {import('./sdk.js').WebSdk<MetricsConfig>} */
export const MetricsSdk: import('./sdk.js').WebSdk<MetricsConfig>;
export type MetricsConfig = {
    otlpEndpoint: string;
    exportHeaders: Record<string, string>;
    resource: import('@opentelemetry/resources').Resource;
};
