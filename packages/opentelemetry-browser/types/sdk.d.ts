export type WebSdkBuilder<T> = {
    with: <K>(sdk: WebSdk<K>) => WebSdkBuilder<T & Partial<K>>;
    build: () => WebSdk<T>;
};
/** @type {WebSdkBuilder<RootConfig>} */
export const WebSdkBuilder: WebSdkBuilder<RootConfig>;
export type RootConfig = {
    disabled?: boolean;
    serviceName?: string;
    serviceVersion?: string;
    logLevel?: string;
    otlpEndpoint?: string;
    resourceAttributes?: Record<string, import('./detector.js').AttributeValue>;
    instrumentations?: import('@opentelemetry/instrumentation').Instrumentation[];
};
export type WebSdk<T> = {
    init: (config: T) => void;
    forceFlush: () => Promise<void>;
};
