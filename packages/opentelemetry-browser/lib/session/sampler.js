/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

/** @enum {number} */
export const SamplingDecision = {
    NOT_RECORD: 0,
    RECORD: 1,
};
/**
 * @typedef {Object} SamplingResult
 * @property {SamplingDecision} decision
 */

/**
 *
 */
export class SessionSampler {
    /** @param {number} ratio */
    constructor(ratio) {
        if (typeof ratio !== 'number' || isNaN(ratio)) {
            diag.warn(
                `session sampling rate must be a valid number. Using default.`
            );
            this._ratio = 1;
        } else if (ratio < 0 || ratio > 1) {
            const clamped = Math.min(Math.max(ratio, 0), 1);
            diag.warn(
                `session sampling rate must be between 0 and 1. Using ${clamped}.`
            );
            this._ratio = clamped;
        } else {
            this._ratio = ratio;
        }
        // Precision will be te to 4 decimal digits (smallest is 0.01%)
        this._ratio = Math.round(this._ratio * 10000) / 10000;
    }

    get ratio() {
        return this._ratio;
    }

    /**
     * @param {string} sessionId
     * @returns {SamplingResult}
     */
    shouldSample(sessionId) {
        if (this._ratio === 0) {
            return {decision: SamplingDecision.NOT_RECORD};
        } else if (this._ratio === 1) {
            return {decision: SamplingDecision.RECORD};
        }

        const clean = sessionId.replace(/-/g, '').toLowerCase();
        const value = parseInt(clean.slice(0, 8), 16);
        const probability = value / 0xffffffff;
        if (probability < this._ratio) {
            return {decision: SamplingDecision.RECORD};
        }
        return {decision: SamplingDecision.NOT_RECORD};
    }

    toString() {
        return `SessionSampler(ratio=${this._ratio})`;
    }
}
