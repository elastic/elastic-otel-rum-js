/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Runs in the extension ISOLATED world. Forwards injection results posted from
 * the MAIN-world loader to the service worker.
 */
(function edotInjectionBridge() {
    const REPORT_SOURCE = 'edot-browser-extension';

    if (globalThis.__EDOT_EXT_BRIDGE_ACTIVE__) {
        return;
    }
    globalThis.__EDOT_EXT_BRIDGE_ACTIVE__ = true;

    window.addEventListener('message', (event) => {
        if (event.source !== window) {
            return;
        }
        const data = event.data;
        if (
            !data ||
            data.source !== REPORT_SOURCE ||
            data.type !== 'injection-status'
        ) {
            return;
        }
        if (typeof data.websiteId !== 'string') {
            return;
        }

        // By CSP rules this might throw
        try {
            void chrome.runtime.sendMessage({
                type: 'injection-status',
                websiteId: data.websiteId,
                status: data.status === 'active' ? 'active' : 'failed',
                message: typeof data.message === 'string' ? data.message : '',
            });
        } catch (err) {
            console.error(`Could not send the injection status: ${err}`)
        }
    });
})();
