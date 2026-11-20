/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

/**
 * @typedef {Object} SessionConfig
 * @property {number} [inactivityTimeout] // seconds, defaults to 30 minutes
 * @property {number} [maxDuration] // seconds, defaults to 4 hours
 * @property {string[]} [activityEvents] // DOM events that count as user activity
 * @property {number} [sampleRate] // within [0..1] range, default 1
 */

export const DEFAULT_INACTIVITY_TIMEOUT_S = 30 * 60;
export const DEFAULT_MAX_DURATION_S = 4 * 60 * 60;
const MIN_INACTIVITY_TIMEOUT_S = 5 * 60;
const MIN_MAX_DURATION_S = 30 * 60;
const MAX_MAX_DURATION_S = 24 * 60 * 60;

/**
 * @param {unknown} config
 * @returns {SessionConfig}
 */
export function normalizeSessionConfig(config) {
    if (config === undefined || config === null) {
        return {};
    }
    if (typeof config !== 'object') {
        diag.warn('Invalid "session" configuration. Using the defaults.');
        return {};
    }
    return config;
}

/**
 * Invalid values fall back to defaults and out-of-range values are clamped,
 * so a bad config never disables sessions nor rotates them on every event.
 * @param {SessionConfig} config
 * @returns {{inactivityTimeout: number, maxDuration: number}} seconds
 */
export function resolveSessionTimeouts(config) {
    const maxDuration = resolveSeconds(
        'maxDuration',
        config.maxDuration,
        DEFAULT_MAX_DURATION_S,
        MIN_MAX_DURATION_S,
        MAX_MAX_DURATION_S
    );
    const inactivityTimeout = resolveSeconds(
        'inactivityTimeout',
        config.inactivityTimeout,
        DEFAULT_INACTIVITY_TIMEOUT_S,
        MIN_INACTIVITY_TIMEOUT_S,
        maxDuration
    );
    return {inactivityTimeout, maxDuration};
}

/**
 * @param {string} name
 * @param {unknown} value
 * @param {number} defaultValue
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function resolveSeconds(name, value, defaultValue, min, max) {
    const fallback = Math.min(defaultValue, max);
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        diag.warn(
            `Invalid "session.${name}" value: ${value}. Using ${fallback}s.`
        );
        return fallback;
    }
    if (value < min || value > max) {
        const clamped = Math.min(Math.max(value, min), max);
        diag.warn(
            `"session.${name}" must be between ${min}s and ${max}s. Using ${clamped}s.`
        );
        return clamped;
    }
    return value;
}
