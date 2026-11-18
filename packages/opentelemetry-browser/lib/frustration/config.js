/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

/**
 * @typedef {Object} FrustrationConfig
 * @property {string[]} [ignoreSelectors] Clicks on elements matching these
 *  CSS selectors, or inside them, are not reported.
 */

/**
 * @param {boolean | FrustrationConfig | undefined} config
 * @returns {FrustrationConfig | undefined} undefined when disabled
 */
export function resolveFrustrationConfig(config) {
    if (config === false) {
        return undefined;
    }
    if (config === undefined || config === true) {
        return {};
    }
    const selectors = config?.ignoreSelectors;
    if (selectors === undefined && typeof config === 'object' && config) {
        return {};
    }
    if (
        Array.isArray(selectors) &&
        selectors.every((s) => typeof s === 'string' && s.length > 0)
    ) {
        return {ignoreSelectors: [...selectors]};
    }
    diag.warn(
        `Invalid "frustration" configuration. Frustration signals are reported without ignored selectors.`
    );
    return {};
}
