/**
 *
 * @param {BrowserSdkConfiguration} cfg
 */
export function startBrowserSdk(cfg?: BrowserSdkConfiguration): void;
export type BrowserSdkConfiguration = {
    disabled?: boolean;
    serviceName?: string;
    serviceVersion?: string;
    logLevel?: string;
    sampleRate?: number;
    resourceAttributes?: Record<string, import('@opentelemetry/api').AttributeValue>;
    otlpEndpoint?: string;
    /**
     * // other options
     */
    exportHeaders?: Record<string, string>;
    samplingRate?: number;
};
