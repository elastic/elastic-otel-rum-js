/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Frustration components live in `./frustration/`, this module is their entry point.

/** @typedef {import('./frustration/config.js').FrustrationConfig} FrustrationConfig */

export {resolveFrustrationConfig} from './frustration/config.js';
export {startFrustrationDetection} from './frustration/dom.js';
export {RequestSpanProcessor} from './frustration/processor.js';
