/**
 * @template T
 * @typedef {Object} WebSdk
 * @property {(config: T) => void} init
 * @property {() => Promise<void>} forceFlush
 */
/**
 * @template T
 * @typedef {Object} WebSdkBuilder
 * @property {<K>(sdk: WebSdk<K>) => WebSdkBuilder<T & Partial<K>>} with
 * @property {() => WebSdk<T>} build
 */
/**
 * @returns {WebSdkBuilder<RootConfig>}
 */
export function WebSdkBuilder(): WebSdkBuilder<RootConfig>;
export type WebSdkBuilder<T> = {
    with: <K>(sdk: WebSdk<K>) => WebSdkBuilder<T & Partial<K>>;
    build: () => WebSdk<T>;
};
export type WebSdk<T> = {
    init: (config: T) => void;
    forceFlush: () => Promise<void>;
};
export type RootConfig = {
    disabled?: boolean;
    serviceName?: string;
    serviceVersion?: string;
    logLevel?: string;
    otlpEndpoint?: string;
    resourceAttributes?: Record<string, import('./detector.js').AttributeValue>;
    instrumentations?: import('@opentelemetry/instrumentation').Instrumentation[];
};
