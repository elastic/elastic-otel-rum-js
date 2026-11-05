/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

/**
 * @typedef {Object} ReplayPrivacyConfig
 * @property {boolean} [maskAllInputs] replace every input value with `*`, default true
 * @property {boolean} [maskAllText] replace all text content with `*`, default true
 * @property {Record<string, boolean>} [maskInputOptions] per input type masking, as in rrweb
 * @property {string} [maskTextSelector] CSS selector whose text is masked when `maskAllText` is false
 * @property {string} [blockSelector] CSS selector whose elements are replaced by an empty box
 * @property {string} [ignoreSelector] CSS selector whose input events are not recorded
 * @property {(text: string, element: HTMLElement) => string} [maskInputFn]
 * @property {(text: string, element: HTMLElement | null) => string} [maskTextFn]
 */

/**
 * @experimental Session replay is experimental and may change in minor releases.
 * @typedef {Object} ReplayConfig
 * @property {boolean} [enabled] default false
 * @property {ReplayPrivacyConfig} [privacy]
 */

/**
 * @typedef {Object} ResolvedReplayConfig
 * @property {boolean} enabled
 * @property {Required<Pick<ReplayPrivacyConfig, 'maskAllInputs' | 'maskAllText'>> & Omit<ReplayPrivacyConfig, 'maskAllInputs' | 'maskAllText'>} privacy
 */

/**
 * Passed by the replay entry point so the core one never imports the recorder.
 * @typedef {Object} ReplayStartOptions
 * @property {ResolvedReplayConfig} config
 * @property {import('../session.js').SessionManager} [sessionManager]
 * @property {import('@opentelemetry/api').Attributes} resourceAttributes
 * @property {{url: string; headers?: Record<string, string>}} exportConfig
 */
/**
 * @typedef {(opts: ReplayStartOptions) => {shutdown: () => Promise<void>} | undefined} StartReplayFn
 */

/** @type {ReadonlyArray<'maskTextSelector' | 'blockSelector' | 'ignoreSelector'>} */
const SELECTOR_KEYS = ['maskTextSelector', 'blockSelector', 'ignoreSelector'];
/** @type {ReadonlyArray<'maskInputFn' | 'maskTextFn'>} */
const FUNCTION_KEYS = ['maskInputFn', 'maskTextFn'];

/**
 * Invalid values fall back to defaults with a warning, so a bad config never
 * turns replay on nor relaxes masking. Invalid selectors or input options
 * disable replay, since dropping them would record what they should hide.
 * @param {unknown} config the `replay` key of the SDK config
 * @param {boolean} hasRecorder whether the SDK was started from the replay entry point
 * @returns {ResolvedReplayConfig}
 */
export function resolveReplayConfig(config, hasRecorder) {
    /** @type {ResolvedReplayConfig} */
    const resolved = {
        enabled: false,
        privacy: {maskAllInputs: true, maskAllText: true},
    };
    if (config === undefined) {
        return resolved;
    }
    if (!hasRecorder) {
        diag.warn(
            'Session replay is only available from the "@elastic/opentelemetry-browser/replay" entry point. Nothing will be recorded.'
        );
        return resolved;
    }
    if (!isObject(config)) {
        diag.warn(`Invalid "replay" value: ${config}. Replay is disabled.`);
        return resolved;
    }

    resolved.enabled = resolveBoolean('enabled', config.enabled, false);

    const privacy = config.privacy;
    if (privacy === undefined) {
        return resolved;
    }
    if (!isObject(privacy)) {
        diag.warn(
            `Invalid "replay.privacy" value: ${privacy}. Using defaults.`
        );
        return resolved;
    }
    resolved.privacy.maskAllInputs = resolveBoolean(
        'privacy.maskAllInputs',
        privacy.maskAllInputs,
        true
    );
    resolved.privacy.maskAllText = resolveBoolean(
        'privacy.maskAllText',
        privacy.maskAllText,
        true
    );
    if (privacy.maskInputOptions !== undefined) {
        if (isObject(privacy.maskInputOptions)) {
            resolved.privacy.maskInputOptions = {...privacy.maskInputOptions};
        } else {
            resolved.enabled = false;
            warnDisabled('privacy.maskInputOptions', privacy.maskInputOptions);
        }
    }
    for (const key of SELECTOR_KEYS) {
        const value = privacy[key];
        if (value === undefined) {
            continue;
        }
        if (isValidSelector(value)) {
            resolved.privacy[key] = value;
        } else {
            resolved.enabled = false;
            warnDisabled(`privacy.${key}`, value);
        }
    }
    for (const key of FUNCTION_KEYS) {
        const value = privacy[key];
        if (typeof value === 'function') {
            resolved.privacy[key] = value;
        } else if (value !== undefined) {
            warnIgnored(`privacy.${key}`, value);
        }
    }
    return resolved;
}

// -- helper functions

/**
 * @param {unknown} value
 * @returns {value is Record<string, any>}
 */
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {string} name
 * @param {unknown} value
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
function resolveBoolean(name, value, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    if (typeof value !== 'boolean') {
        diag.warn(
            `Invalid "replay.${name}" value: ${value}. Using ${defaultValue}.`
        );
        return defaultValue;
    }
    return value;
}

/**
 * Without a DOM (unit tests) only the type is checked.
 * @param {unknown} value
 * @returns {value is string}
 */
function isValidSelector(value) {
    if (typeof value !== 'string' || !value.trim()) {
        return false;
    }
    if (typeof document === 'undefined') {
        return true;
    }
    try {
        document.createDocumentFragment().querySelector(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * @param {string} name
 * @param {unknown} value
 */
function warnDisabled(name, value) {
    diag.warn(
        `Invalid "replay.${name}" value: ${value}. Replay is disabled so it doesn't record what this setting should hide.`
    );
}

/**
 * @param {string} name
 * @param {unknown} value
 */
function warnIgnored(name, value) {
    diag.warn(`Invalid "replay.${name}" value: ${value}. Ignoring it.`);
}
