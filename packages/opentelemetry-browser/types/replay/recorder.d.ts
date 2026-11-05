/**
 * Starts recording the page into its own logger and batch processor, so large
 * snapshots don't compete with other logs for the export queue.
 * @param {StartReplayOptions} opts
 * @returns {{shutdown: () => Promise<void>} | undefined}
 */
export function startReplay(opts: StartReplayOptions): {
    shutdown: () => Promise<void>;
} | undefined;
/**
 * Maps the privacy config to rrweb options, always including the
 * `data-elastic-replay` selectors.
 * @param {import('./config.js').ResolvedReplayConfig['privacy']} privacy
 * @returns {Omit<RecordOptions, 'emit'>}
 */
export function toRecordPrivacyOptions(privacy: import("./config.js").ResolvedReplayConfig["privacy"]): Omit<RecordOptions, "emit">;
/**
 * The subset of an rrweb event this module reads.
 * @typedef {{type: number; timestamp: number}} RecorderEvent
 */
/**
 * The subset of rrweb `record` options this module sets.
 * @typedef {Object} RecordOptions
 * @property {(event: RecorderEvent) => void} emit
 * @property {boolean} maskAllInputs
 * @property {Record<string, boolean>} [maskInputOptions]
 * @property {(text: string, element: HTMLElement) => string} [maskInputFn]
 * @property {(text: string, element: HTMLElement | null) => string} [maskTextFn]
 * @property {string} maskTextSelector
 * @property {string} blockSelector
 * @property {string} ignoreSelector
 */
/**
 * rrweb `record`, injected so tests can run without a DOM.
 * @typedef {(options: RecordOptions) => (() => void) | undefined} RecordFn
 */
/**
 * @typedef {import('./config.js').ReplayStartOptions & {
 *  record: RecordFn;
 *  exporter?: import('@opentelemetry/sdk-logs').LogRecordExporter;
 * }} StartReplayOptions
 */
export const REPLAY_SCOPE_NAME: "@elastic/opentelemetry-browser/replay";
/**
 * The subset of an rrweb event this module reads.
 */
export type RecorderEvent = {
    type: number;
    timestamp: number;
};
/**
 * The subset of rrweb `record` options this module sets.
 */
export type RecordOptions = {
    emit: (event: RecorderEvent) => void;
    maskAllInputs: boolean;
    maskInputOptions?: Record<string, boolean> | undefined;
    maskInputFn?: ((text: string, element: HTMLElement) => string) | undefined;
    maskTextFn?: ((text: string, element: HTMLElement | null) => string) | undefined;
    maskTextSelector: string;
    blockSelector: string;
    ignoreSelector: string;
};
/**
 * rrweb `record`, injected so tests can run without a DOM.
 */
export type RecordFn = (options: RecordOptions) => (() => void) | undefined;
export type StartReplayOptions = import("./config.js").ReplayStartOptions & {
    record: RecordFn;
    exporter?: import("@opentelemetry/sdk-logs").LogRecordExporter;
};
