/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';
import {OTLPLogExporter} from '@opentelemetry/exporter-logs-otlp-http';
import {
    defaultResource,
    resourceFromAttributes,
} from '@opentelemetry/resources';
import {BatchLogRecordProcessor, LoggerProvider} from '@opentelemetry/sdk-logs';

import {
    ATTR_REPLAY_EVENT_TYPE,
    ATTR_REPLAY_FORMAT,
    ATTR_REPLAY_SEGMENT_ID,
    ATTR_REPLAY_SEQUENCE,
    ATTR_REPLAY_TRIGGER,
    EVENT_REPLAY_EVENT,
    EVENT_REPLAY_START,
} from '../semconv.js';
import {generateUUID, SessionLogRecordProcessor} from '../session.js';
import {EDOT_VERSION} from '../version.js';

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

export const REPLAY_SCOPE_NAME = '@elastic/opentelemetry-browser/replay';
// Body format of replay records and its major version
const REPLAY_FORMAT = 'rrweb/2';

// Markup can opt out of recording without config. Configured selectors add to these.
const MASK_SELECTOR = '[data-elastic-replay="mask"]';
const BLOCK_SELECTOR = '[data-elastic-replay="block"]';
const IGNORE_SELECTOR = '[data-elastic-replay="ignore"]';

/**
 * Starts recording the page into its own logger and batch processor, so large
 * snapshots don't compete with other logs for the export queue.
 * @param {StartReplayOptions} opts
 * @returns {{shutdown: () => Promise<void>} | undefined}
 */
export function startReplay(opts) {
    const {config, record, sessionManager} = opts;
    if (!config.enabled) {
        return undefined;
    }
    // Replay records are useless without a `session.id` to group them
    if (!sessionManager) {
        diag.warn('Session replay needs sessions. Nothing will be recorded.');
        return undefined;
    }
    if (!sessionManager.getSession()?.sampled) {
        diag.debug('Session not sampled. Replay not started.');
        return undefined;
    }

    const loggerProvider = new LoggerProvider({
        resource: defaultResource().merge(
            resourceFromAttributes(opts.resourceAttributes)
        ),
        processors: [
            new SessionLogRecordProcessor({manager: sessionManager}),
            new BatchLogRecordProcessor({
                exporter:
                    opts.exporter ?? new OTLPLogExporter(opts.exportConfig),
            }),
        ],
    });
    const logger = loggerProvider.getLogger(REPLAY_SCOPE_NAME, EDOT_VERSION);

    const segmentId = generateUUID();
    let sequence = 0;

    /** @param {RecorderEvent} event */
    const emit = (event) => {
        // TODO: rotate the segment with the session (#142)
        // Also drops events between `endSession()` and the next session
        if (!sessionManager.getSession()?.sampled) {
            return;
        }
        if (sequence === 0) {
            logger.emit({
                eventName: EVENT_REPLAY_START,
                timestamp: event.timestamp,
                attributes: {
                    [ATTR_REPLAY_SEGMENT_ID]: segmentId,
                    [ATTR_REPLAY_TRIGGER]: 'sampled',
                    [ATTR_REPLAY_FORMAT]: REPLAY_FORMAT,
                },
            });
        }
        logger.emit({
            eventName: EVENT_REPLAY_EVENT,
            timestamp: event.timestamp,
            body: JSON.stringify(event),
            attributes: {
                [ATTR_REPLAY_SEGMENT_ID]: segmentId,
                [ATTR_REPLAY_SEQUENCE]: sequence++,
                [ATTR_REPLAY_EVENT_TYPE]: event.type,
            },
        });
    };

    /** @type {(() => void) | undefined} */
    let stop;
    try {
        stop = record({emit, ...toRecordPrivacyOptions(config.privacy)});
    } catch (err) {
        diag.warn('Session replay failed to start', err);
    }
    if (!stop) {
        loggerProvider.shutdown();
        return undefined;
    }

    return {
        shutdown() {
            stop?.();
            stop = undefined;
            return loggerProvider.shutdown();
        },
    };
}

/**
 * Maps the privacy config to rrweb options, always including the
 * `data-elastic-replay` selectors.
 * @param {import('./config.js').ResolvedReplayConfig['privacy']} privacy
 * @returns {Omit<RecordOptions, 'emit'>}
 */
export function toRecordPrivacyOptions(privacy) {
    return {
        maskAllInputs: privacy.maskAllInputs,
        maskInputOptions: privacy.maskInputOptions,
        maskInputFn: privacy.maskInputFn,
        maskTextFn: privacy.maskTextFn,
        maskTextSelector: privacy.maskAllText
            ? '*'
            : joinSelectors(MASK_SELECTOR, privacy.maskTextSelector),
        blockSelector: joinSelectors(BLOCK_SELECTOR, privacy.blockSelector),
        ignoreSelector: joinSelectors(IGNORE_SELECTOR, privacy.ignoreSelector),
    };
}

// -- helper functions

/**
 * @param {string} builtin
 * @param {string} [configured]
 * @returns {string}
 */
function joinSelectors(builtin, configured) {
    return configured ? `${builtin}, ${configured}` : builtin;
}
