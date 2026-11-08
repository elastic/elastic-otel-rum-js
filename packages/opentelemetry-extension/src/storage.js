/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {import('./types/websites.js').MonitoredWebsite} MonitoredWebsite */
/** @typedef {import('./types/websites.js').WebsitesStorage} WebsitesStorage */
/** @typedef {import('./types/websites.js').InjectionStatus} InjectionStatus */

export const WEBSITES_STORAGE_KEY = 'monitoredWebsites';

/**
 * @returns {Promise<MonitoredWebsite[]>}
 */
export async function getWebsites() {
    const result = await chrome.storage.local.get(WEBSITES_STORAGE_KEY);
    const stored = result[WEBSITES_STORAGE_KEY];
    if (!stored || typeof stored !== 'object') {
        return [];
    }
    const websites = /** @type {WebsitesStorage} */ (stored).websites;
    return Array.isArray(websites) ? websites : [];
}

/**
 * @param {MonitoredWebsite[]} websites
 * @returns {Promise<void>}
 */
export async function saveWebsites(websites) {
    /** @type {WebsitesStorage} */
    const payload = {websites};
    await chrome.storage.local.set({[WEBSITES_STORAGE_KEY]: payload});
}

/**
 * @param {MonitoredWebsite} website
 * @returns {Promise<void>}
 */
export async function upsertWebsite(website) {
    const websites = await getWebsites();
    const index = websites.findIndex((w) => w.id === website.id);
    /** @type {MonitoredWebsite} */
    const next = {
        ...website,
        injection_status: 'unknown',
        injection_message: undefined,
        injection_checked_at: undefined,
    };
    if (index === -1) {
        websites.push(next);
    } else {
        websites[index] = next;
    }
    await saveWebsites(websites);
}

/**
 * @param {string} id
 * @param {InjectionStatus} status
 * @param {string} [message]
 * @returns {Promise<void>}
 */
export async function setWebsiteInjectionStatus(id, status, message) {
    const websites = await getWebsites();
    const index = websites.findIndex((w) => w.id === id);
    if (index === -1) {
        return;
    }
    websites[index] = {
        ...websites[index],
        injection_status: status,
        injection_message: message,
        injection_checked_at: new Date().toISOString(),
    };
    await saveWebsites(websites);
}

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteWebsite(id) {
    const websites = await getWebsites();
    await saveWebsites(websites.filter((w) => w.id !== id));
}
