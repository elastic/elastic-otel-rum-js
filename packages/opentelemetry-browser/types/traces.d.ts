/** @type {import('./sdk.js').WebSdk<TraceSdkConfig>} */
export const TracesSdk: import('./sdk.js').WebSdk<TraceSdkConfig>;
export type TraceSdkConfig = {
    otlpEndpoint: string;
    sampleRate: number;
    exportHeaders: Record<string, string>;
    resource: import('@opentelemetry/resources').Resource;
};
