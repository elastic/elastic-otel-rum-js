/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {startBrowserSdk} from './sdk.js';
import {configFromScriptDataset} from './capture.js';

globalThis['startBrowserSdk'] = startBrowserSdk;

try {
    const script = document.currentScript;
    if (script?.dataset?.otlpEndpoint) {
        startBrowserSdk(configFromScriptDataset(script.dataset));
    }
} catch {
    // Script-tag auto-start is best-effort.
}
