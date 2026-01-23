/**
 * TODO: luggite like?
 * @param {Object} config
 * @param {string} config.logLevel
 * @returns {import('@opentelemetry/api').DiagLogger}
 */
export function createLogger(config: {
    logLevel: string;
}): import('@opentelemetry/api').DiagLogger;
