/**
 * Starts rrweb recording (loads `@rrweb/record` dynamically).
 *
 * @param {{
 *   samplingRate?: number,
 *   errorSamplingRate?: number,
 *   replayLogger: import('@opentelemetry/api-logs').Logger,
 *   getSessionId: () => string | null,
 *   checkRotation: (cfg?: any, fn?: Function) => boolean,
 *   privacy?: object,
 *   quality?: object,
 *   sampling?: {mousemove?: number, scroll?: number, input?: string, canvas?: number},
 *   maxChunkBytes?: number,
 * }} cfg
 * @returns {Promise<void>}
 */
export function startReplay(cfg: {
    samplingRate?: number;
    errorSamplingRate?: number;
    replayLogger: import('@opentelemetry/api-logs').Logger;
    getSessionId: () => string | null;
    checkRotation: (cfg?: any, fn?: Function) => boolean;
    privacy?: object;
    quality?: object;
    sampling?: {
        mousemove?: number;
        scroll?: number;
        input?: string;
        canvas?: number;
    };
    maxChunkBytes?: number;
}): Promise<void>;
export function pauseReplay(): void;
export function resumeReplay(): void;
export function stopReplay(): void;
