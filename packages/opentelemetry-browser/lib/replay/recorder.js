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

import {MASKABLE_INPUT_TYPES} from './config.js';
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
 * @property {(text: string, element: HTMLElement | null) => string} [maskInputFn]
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
 * Looks up the DOM node of an rrweb node id.
 * @typedef {(id: number) => unknown} GetNodeFn
 */
/**
 * @typedef {import('./config.js').ReplayStartOptions & {
 *  record: RecordFn;
 *  getNode?: GetNodeFn;
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

// rrweb `IncrementalSource.Input`
const INCREMENTAL_SOURCE_INPUT = 5;

// rrweb masks text nodes only, these attributes often hold the same content
const TEXT_ATTRIBUTES = [
    'alt',
    'aria-description',
    'aria-label',
    'aria-valuetext',
    'label',
    'placeholder',
    'title',
];
// Inputs whose `value` is their visible label
const LABEL_INPUT_TYPES = ['button', 'reset', 'submit'];
// Inputs whose `value` rrweb copies as is, even with `maskAllInputs`
const CHOICE_INPUT_TYPES = ['checkbox', 'radio'];

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
    let started = false;

    // The first error is a warning, since the replay may now be incomplete
    let warned = false;
    /** @param {unknown} err */
    const onError = (err) => {
        if (warned) {
            diag.debug('Session replay error', err);
            return true;
        }
        warned = true;
        diag.warn(
            'Session replay error, the replay may be incomplete. Further errors are logged at debug level.',
            err
        );
        return true;
    };

    const replacer = createMasker(config.privacy, opts.getNode, onError);

    /** @param {RecorderEvent} event */
    const emitEvent = (event) => {
        if (
            event.type === EVENT_TYPE_DOM_CONTENT_LOADED ||
            event.type === EVENT_TYPE_LOAD
        ) {
            return;
        }
        // Taken before anything can drop the event, so a player sees the gap
        const eventSequence = sequence++;
        // TODO: rotate the segment with the session (#142)
        // Also drops events between `endSession()` and the next session
        if (!sessionManager.getSession()?.sampled) {
            return;
        }
        const body = JSON.stringify(event, replacer);
        if (!started) {
            started = true;
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
                [ATTR_REPLAY_SEQUENCE]: eventSequence,
                [ATTR_REPLAY_EVENT_TYPE]: event.type,
            },
        });
    };

    // rrweb calls `emit` inside app code, e.g. patched `insertRule`, so
    // errors must not reach the app
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
        // rrweb's `maskAllInputs` replaces `maskInputOptions` with a list that
        // leaves out `hidden` and `file`, so the SDK always passes its own
        maskAllInputs: false,
        maskInputOptions: privacy.maskAllInputs
            ? Object.fromEntries(MASKABLE_INPUT_TYPES.map((t) => [t, true]))
            : // Hidden inputs are never shown, so masking them costs nothing
              {password: true, hidden: true, ...privacy.maskInputOptions},
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
 * `JSON.stringify` replacer that masks what rrweb copies as is:
 * - with `maskAllText`, text-bearing attributes and button labels,
 * - with `maskAllInputs`, checkbox, radio and `<option>` values.
 * It applies to snapshots, attribute mutations and input events alike.
 * @param {import('./config.js').ResolvedReplayConfig['privacy']} privacy
 * @param {GetNodeFn | undefined} getNode
 * @param {(err: unknown) => void} onError
 * @returns {((this: unknown, key: string, value: unknown) => unknown) | undefined}
 */
function createMasker(privacy, getNode, onError) {
    const {maskAllText, maskAllInputs} = privacy;
    if (!maskAllText && !maskAllInputs) {
        return undefined;
    }
    const maskText = safeMask(
        privacy.maskTextFn,
        (text) => text.replace(/\S/g, '*'),
        onError
    );
    const maskInput = safeMask(
        privacy.maskInputFn,
        (text) => '*'.repeat(text.length),
        onError
    );

    /**
     * @param {Record<string, unknown>} attributes
     * @param {unknown} holder the serialized node, or the attribute mutation
     */
    const maskAttributes = (attributes, holder) => {
        const element = getElement(holder, getNode);
        // Serialized nodes have their tag name, mutations only an id
        const tagName =
            (isObject(holder) && typeof holder.tagName === 'string'
                ? holder.tagName
                : elementTagName(element)) ?? '';
        const type = String(
            attributes.type ?? elementType(element) ?? ''
        ).toLowerCase();
        /** @type {Record<string, unknown> | undefined} */
        let masked;
        /**
         * @param {string} name
         * @param {(text: string, node: unknown) => string} mask
         */
        const maskAttribute = (name, mask) => {
            const text = attributes[name];
            if (typeof text === 'string' && text !== '') {
                masked ??= {...attributes};
                masked[name] = mask(text, element);
            }
        };
        if (maskAllText) {
            TEXT_ATTRIBUTES.forEach((name) => maskAttribute(name, maskText));
            if (tagName === 'input' && LABEL_INPUT_TYPES.includes(type)) {
                maskAttribute('value', maskText);
            }
        }
        if (
            maskAllInputs &&
            (tagName === 'option' ||
                (tagName === 'input' && CHOICE_INPUT_TYPES.includes(type)))
        ) {
            maskAttribute('value', maskInput);
        }
        return masked ?? attributes;
    };

    return function (key, value) {
        if (key === 'attributes' && isObject(value)) {
            return maskAttributes(value, this);
        }
        // rrweb sends checkbox and radio values with their checked state
        if (
            maskAllInputs &&
            key === 'text' &&
            typeof value === 'string' &&
            isObject(this) &&
            this.source === INCREMENTAL_SOURCE_INPUT
        ) {
            const element = getElement(this, getNode);
            if (CHOICE_INPUT_TYPES.includes(elementType(element) ?? '')) {
                return maskInput(value, element);
            }
        }
        return value;
    };
}

/**
 * Wraps an app mask function, falling back to the default mask when it
 * throws, e.g. when it reads an element the SDK cannot look up.
 * @param {((text: string, element: HTMLElement | null) => string) | undefined} fn
 * @param {(text: string) => string} fallback
 * @param {(err: unknown) => void} onError
 * @returns {(text: string, node: unknown) => string}
 */
function safeMask(fn, fallback, onError) {
    if (!fn) {
        return fallback;
    }
    return (text, node) => {
        try {
            const masked = fn(text, toHTMLElement(node));
            if (typeof masked === 'string') {
                return masked;
            }
        } catch (err) {
            onError(err);
        }
        return fallback(text);
    };
}

/**
 * @param {unknown} holder
 * @param {GetNodeFn | undefined} getNode
 * @returns {unknown} the element, or null
 */
function getElement(holder, getNode) {
    if (!getNode || !isObject(holder) || typeof holder.id !== 'number') {
        return null;
    }
    return getNode(holder.id) ?? null;
}

/**
 * @param {unknown} node
 * @returns {HTMLElement | null}
 */
function toHTMLElement(node) {
    return typeof HTMLElement !== 'undefined' && node instanceof HTMLElement
        ? node
        : null;
}

/**
 * @param {unknown} element
 * @returns {string | undefined}
 */
function elementTagName(element) {
    return isObject(element) && typeof element.tagName === 'string'
        ? element.tagName.toLowerCase()
        : undefined;
}

/**
 * @param {unknown} element
 * @returns {string | undefined}
 */
function elementType(element) {
    return isObject(element) && typeof element.type === 'string'
        ? element.type.toLowerCase()
        : undefined;
}

/**
 * rrweb serializes element attributes as a plain object, and attribute
 * mutations as an array of `{id, attributes}`.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObject(value) {
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
