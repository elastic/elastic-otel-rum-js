/**
 * @typedef {Object} BrowserSdkConfig
 * @property {boolean} [disabled]
 * @property {string} [serviceName]
 * @property {string} [serviceVersion]
 * @property {string} [logLevel] // defaults to 'info'
 * @property {number} [sampleRate] // defaults to 1
 * @property {string} [otlpEndpoint] // defaults to 'http://localhost:4318'
 * @property {Record<string, string>} [exportHeaders] // defaults to {}
 * @property {import('@opentelemetry/instrumentation').Instrumentation[]} [instrumentations] // defaults to []
 */
/**
 * @typedef {Object} BrowserSdk
 * @property {() => Promise<void>} shutdown
 * TODO: add more properties
 */
/**
 * @template T
 * @typedef {(config: T & BrowserSdkConfig) => BrowserSdk} SdkBuilder<T>
 */
/**
 * @typedef {Object} Signal
 * @property {() => Promise<void>} shutdown
 */
/**
 * @template T
 * @typedef {(config: T) => Signal} SignalBuilder<T>
 */
/**
 * @template S1
 * @template S2
 * @template S3
 * @param {SignalBuilder<S1>} firstSignalBuilder
 * @param {SignalBuilder<S2>} [secondSignalBuilder]
 * @param {SignalBuilder<S3>} [thirdSignalBuilder]
 * @returns {SdkBuilder<Parameters<SignalBuilder<S1>>[0] & Parameters<SignalBuilder<S2>>[0] & Parameters<SignalBuilder<S3>>[0]>}
 */
export function buildSdk<S1, S2, S3>(firstSignalBuilder: SignalBuilder<S1>, secondSignalBuilder?: SignalBuilder<S2>, thirdSignalBuilder?: SignalBuilder<S3>, ...args: any[]): SdkBuilder<S1 & S2 & S3>;
export type BrowserSdkConfig = {
    disabled?: boolean;
    serviceName?: string;
    serviceVersion?: string;
    logLevel?: string;
    sampleRate?: number;
    otlpEndpoint?: string;
    exportHeaders?: Record<string, string>;
    instrumentations?: import('@opentelemetry/instrumentation').Instrumentation[];
};
export type BrowserSdk = {
    /**
     * TODO: add more properties
     */
    shutdown: () => Promise<void>;
};
/**
 * <T>
 */
export type SdkBuilder<T> = (config: T & BrowserSdkConfig) => BrowserSdk;
export type Signal = {
    shutdown: () => Promise<void>;
};
/**
 * <T>
 */
export type SignalBuilder<T> = (config: T) => Signal;
