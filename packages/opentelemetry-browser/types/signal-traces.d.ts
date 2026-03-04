/**
 * TODO: add processors as config option
 * @param {Object} config
 * @param {string} config.otlpEndpoint
 * @param {import('@opentelemetry/resources').Resource} config.resource
 * @param {Record<string, string>} [config.exportHeaders] // defaults to {}
 * @param {number} [config.sampleRate] // defaults to 1
 *
 * @returns {{shutdown: () => Promise<void>}}
 */
export function withTraces(config: {
    otlpEndpoint: string;
    resource: import('@opentelemetry/resources').Resource;
    exportHeaders?: Record<string, string>;
    sampleRate?: number;
}): {
    shutdown: () => Promise<void>;
};
