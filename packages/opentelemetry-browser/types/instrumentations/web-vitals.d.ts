export class WebVitalsInstrumentation extends InstrumentationBase<import("@opentelemetry/instrumentation").InstrumentationConfig> {
    /**
     * @param {InstrumentationConfig & WebVitalsInstrumentationConfig} config
     */
    constructor(config?: InstrumentationConfig & WebVitalsInstrumentationConfig);
    _applyCustomLogRecordData: (record: import("@opentelemetry/api-logs").LogRecord) => void;
    _includeRawAttribution: boolean;
    init(): any[];
    _isEnabled: boolean;
    _listenersRegistered: boolean;
    /**
     * Gets the timestamp for a metric based on attribution timing.
     * Returns undefined to let OTel use the current time for metrics without
     * specific timing information.
     */
    _getTimestampForMetric(metric: any): any;
    _emitWebVital(metric: any): void;
}
export type LogRecord = import('@opentelemetry/api-logs').LogRecord;
export type InstrumentationConfig = import('@opentelemetry/instrumentation').InstrumentationConfig;
/**
 * WebVitalsInstrumentation Configuration
 */
export type WebVitalsInstrumentationConfig = {
    includeRawAttribution?: boolean;
    applyCustomLogRecordData?: (record: LogRecord) => void;
};
import { InstrumentationBase } from '@opentelemetry/instrumentation';
