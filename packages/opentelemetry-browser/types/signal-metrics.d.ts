/**
 * TODO: add readers as config option?
 * @param {Object} config
 * @param {string} config.otlpEndpoint
 * @param {import('@opentelemetry/resources').Resource} config.resource
 * @param {Record<string, string>} [config.exportHeaders] // defaults to {}
 *
 * @returns {{shutdown: () => Promise<void>}}
 */
export function withMetrics(config: {
    otlpEndpoint: string;
    resource: import('@opentelemetry/resources').Resource;
    exportHeaders?: Record<string, string>;
}): {
    shutdown: () => Promise<void>;
};
