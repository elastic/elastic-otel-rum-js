/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {describeInjectionError} from './injection-status.js';
import {findWebsiteForUrl} from './match-host.js';
import {getCollectorById} from './storage/collectors.js';
import {getWebsites, setWebsiteInjectionStatus} from './storage.js';

/** @typedef {import('./types/websites.js').EdotInjectConfig} EdotInjectConfig */

/** @type {Set<number>} */
const tabsBeingInjected = new Set();

/**
 * @param {MonitoredWebsite} website
 * @param {import('./types/collectors.js').Collector} collector
 * @returns {EdotInjectConfig}
 */
function toInjectConfig(website, collector) {
    return {
        websiteId: website.id,
        host: website.host,
        version: website.version,
        endpoint: collector.url,
        api_key: collector.api_key,
        service_name: website.service_name,
        service_version: website.service_version,
    };
}

/** @typedef {import('./types/websites.js').MonitoredWebsite} MonitoredWebsite */

/**
 * @param {number} tabId
 * @param {EdotInjectConfig} config
 * @returns {Promise<void>}
 */
async function injectEdot(tabId, config) {
    if (tabsBeingInjected.has(tabId)) {
        return;
    }
    tabsBeingInjected.add(tabId);
    try {
        await chrome.scripting.executeScript({
            target: {tabId},
            world: 'ISOLATED',
            files: ['src/page/injection-bridge.js'],
        });
        await chrome.scripting.executeScript({
            target: {tabId},
            world: 'MAIN',
            func: (cfg) => {
                window.__EDOT_EXT_CONFIG__ = cfg;
            },
            args: [config],
        });
        await chrome.scripting.executeScript({
            target: {tabId},
            world: 'MAIN',
            files: ['src/page/inject-edot.js'],
        });
    } catch (err) {
        const message = describeInjectionError(err);
        console.warn('[EDOT extension] Injection skipped for tab', tabId, err);
        await setWebsiteInjectionStatus(config.websiteId, 'failed', message);
    } finally {
        tabsBeingInjected.delete(tabId);
    }
}

/**
 * @param {number} tabId
 * @param {string | undefined} url
 * @returns {Promise<void>}
 */
async function maybeInjectForTab(tabId, url) {
    if (!url) {
        return;
    }
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return;
    }

    const websites = await getWebsites();
    const website = findWebsiteForUrl(parsed, websites);
    if (!website) {
        return;
    }

    const collector = await getCollectorById(website.collector_id);
    if (!collector) {
        await setWebsiteInjectionStatus(
            website.id,
            'failed',
            'No collector found for this website.'
        );
        return;
    }

    await injectEdot(tabId, toInjectConfig(website, collector));
}

/**
 * @param {number} tabId
 * @returns {Promise<void>}
 */
async function injectForTabId(tabId) {
    const tab = await chrome.tabs.get(tabId);
    await maybeInjectForTab(tabId, tab.url);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') {
        return;
    }
    void maybeInjectForTab(tabId, tab.url ?? changeInfo.url);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
        return;
    }
    if (!changes.monitoredWebsites && !changes.collectors) {
        return;
    }
    void (async () => {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.id !== undefined) {
                await maybeInjectForTab(tab.id, tab.url);
            }
        }
    })();
});

chrome.runtime.onInstalled.addListener(() => {
    void (async () => {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.id !== undefined) {
                await maybeInjectForTab(tab.id, tab.url);
            }
        }
    })();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'refresh-injections') {
        void (async () => {
            const tabs = await chrome.tabs.query({});
            for (const tab of tabs) {
                if (tab.id !== undefined) {
                    await maybeInjectForTab(tab.id, tab.url);
                }
            }
            sendResponse({ok: true});
        })();
        return true;
    }
    if (message?.type === 'inject-tab' && typeof message.tabId === 'number') {
        void injectForTabId(message.tabId).then(
            () => sendResponse({ok: true}),
            (err) => sendResponse({ok: false, error: String(err)})
        );
        return true;
    }
    if (
        message?.type === 'injection-status' &&
        typeof message.websiteId === 'string'
    ) {
        const status = message.status === 'active' ? 'active' : 'failed';
        void setWebsiteInjectionStatus(
            message.websiteId,
            status,
            typeof message.message === 'string' ? message.message : undefined
        ).then(() => sendResponse({ok: true}));
        return true;
    }
    return undefined;
});
