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
 * @property {'DOMContentLoaded'} recordAfter
 * @property {(error: unknown) => boolean} errorHandler
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

// rrweb `EventType` values that carry no data. Skipping them keeps Meta and
// FullSnapshot at the start of every segment.
const EVENT_TYPE_DOM_CONTENT_LOADED = 0;
const EVENT_TYPE_LOAD = 1;

// rrweb masks text nodes only, these attributes often hold the same content
const TEXT_ATTRIBUTES = [
    'alt',
    'aria-description',
    'aria-label',
    'aria-valuetext',
    'placeholder',
    'title',
];

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

    const replacer = config.privacy.maskAllText
        ? attributesMasker(config.privacy.maskTextFn)
        : undefined;

    /** @param {RecorderEvent} event */
    const emitEvent = (event) => {
        if (
            event.type === EVENT_TYPE_DOM_CONTENT_LOADED ||
            event.type === EVENT_TYPE_LOAD
        ) {
            return;
        }
        // TODO: rotate the segment with the session (#142)
        // Also drops events between `endSession()` and the next session
        if (!sessionManager.getSession()?.sampled) {
            return;
        }
        const body = JSON.stringify(event, replacer);
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
            body,
            attributes: {
                [ATTR_REPLAY_SEGMENT_ID]: segmentId,
                [ATTR_REPLAY_SEQUENCE]: sequence++,
                [ATTR_REPLAY_EVENT_TYPE]: event.type,
            },
        });
    };

    // rrweb calls `emit` inside app code, e.g. patched `insertRule`, so
    // errors must not reach the app
    /** @param {unknown} err */
    const onError = (err) => {
        diag.debug('Session replay error', err);
        return true;
    };
    /** @param {RecorderEvent} event */
    const emit = (event) => {
        try {
            emitEvent(event);
        } catch (err) {
            onError(err);
        }
    };

    /** @type {(() => void) | undefined} */
    let stop;
    try {
        stop = record({
            emit,
            errorHandler: onError,
            // Instead of `load`, so slow subresources don't delay recording
            recordAfter: 'DOMContentLoaded',
            ...toRecordPrivacyOptions(config.privacy),
        });
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
 * @returns {Omit<RecordOptions, 'emit' | 'recordAfter' | 'errorHandler'>}
 */
export function toRecordPrivacyOptions(privacy) {
    return {
        maskAllInputs: privacy.maskAllInputs,
        // rrweb drops its default password masking when options are given
        maskInputOptions: privacy.maskInputOptions && {
            password: true,
            ...privacy.maskInputOptions,
        },
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
 * `JSON.stringify` replacer that masks text-bearing attributes, in snapshots
 * and in attribute mutations alike.
 * @param {(text: string, element: HTMLElement | null) => string} [maskTextFn]
 * @returns {(key: string, value: unknown) => unknown}
 */
function attributesMasker(maskTextFn) {
    const mask = maskTextFn
        ? (/** @type {string} */ text) => maskTextFn(text, null)
        : (/** @type {string} */ text) => text.replace(/\S/g, '*');
    return (key, value) => {
        if (key !== 'attributes' || !isAttributesMap(value)) {
            return value;
        }
        if (!TEXT_ATTRIBUTES.some((name) => typeof value[name] === 'string')) {
            return value;
        }
        const masked = {...value};
        for (const name of TEXT_ATTRIBUTES) {
            const text = masked[name];
            if (typeof text === 'string') {
                masked[name] = mask(text);
            }
        }
        return masked;
    };
}

/**
 * rrweb serializes element attributes as a plain object, and attribute
 * mutations as an array of `{id, attributes}`.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isAttributesMap(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {string} builtin
 * @param {string} [configured]
 * @returns {string}
 */
function joinSelectors(builtin, configured) {
    return configured ? `${builtin}, ${configured}` : builtin;
}
