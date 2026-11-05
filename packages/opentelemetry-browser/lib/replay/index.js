/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Entry point with the session replay recorder built in. It is the only module
// that imports rrweb, so apps that don't import it get no rrweb in their bundle.
import {record} from '@rrweb/record';

import {startSdk} from '../sdk.js';
import {startReplay} from './recorder.js';

/**
 * Same as `startBrowserSdk` from the core entry point, plus session replay.
 * @param {import('../sdk.js').BrowserSdkConfiguration} cfg
 * @returns {import('../sdk.js').BrowserSdk}
 */
export function startBrowserSdk(cfg = {}) {
    return startSdk(cfg, {
        startReplay: (opts) => startReplay({...opts, record}),
    });
}
