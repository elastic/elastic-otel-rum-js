/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Session components live in `./session/`, this module is their entry point.

/** @typedef {import('./session/config.js').SessionConfig} SessionConfig */
/** @typedef {import('./session/state.js').SessionInfo} SessionInfo */
/** @typedef {import('./session/state.js').SessionState} SessionState */
/** @typedef {import('./session/observers.js').SessionObserver} SessionObserver */
/** @typedef {import('./session/api.js').SessionApi} SessionApi */
/** @typedef {import('./session/manager.js').SessionManagerOptions} SessionManagerOptions */
/** @typedef {import('./session/sampler.js').SamplingResult} SamplingResult */
/** @typedef {import('./session/processors.js').SpanProcessor} SpanProcessor */
/** @typedef {import('./session/processors.js').SessionSpanProcessorOptions} SessionSpanProcessorOptions */
/** @typedef {import('./session/processors.js').LogRecordProcessor} LogRecordProcessor */
/** @typedef {import('./session/processors.js').SessionLogRecordProcessorOptions} SessionLogRecordProcessorOptions */

export {
    DEFAULT_ACTIVITY_EVENTS,
    resolveActivityEvents,
    trackUserActivity,
} from './session/activity.js';
export {createSessionApi} from './session/api.js';
export {resolveSessionTimeouts} from './session/config.js';
export {generateUUID} from './session/id.js';
export {createSessionManager, SessionManager} from './session/manager.js';
export {
    SessionLogRecordProcessor,
    SessionSpanProcessor,
} from './session/processors.js';
export {SamplingDecision, SessionSampler} from './session/sampler.js';
export {SESSION_STORAGE_KEY, TAB_STORAGE_KEY} from './session/storage.js';
