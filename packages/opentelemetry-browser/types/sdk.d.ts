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
    resourceAttributes?: Record<string, import('./detector.js').AttributeValue>;
    otlpEndpoint?: string;
    /**
     * // other options
     */
    exportHeaders?: Record<string, string>;
    samplingRate?: number;
};
