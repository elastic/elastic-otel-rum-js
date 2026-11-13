/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {getWebsites, saveWebsites} from '../storage.js';

/** @typedef {import('../types/collectors.js').Collector} Collector */
/** @typedef {import('../types/collectors.js').CollectorsStorage} CollectorsStorage */

export const COLLECTORS_STORAGE_KEY = 'collectors';

/**
 * @returns {Promise<Collector[]>}
 */
export async function getCollectors() {
    const result = await chrome.storage.local.get(COLLECTORS_STORAGE_KEY);
    const stored = result[COLLECTORS_STORAGE_KEY];
    if (!stored || typeof stored !== 'object') {
        return [];
    }
    const collectors = /** @type {CollectorsStorage} */ (stored).collectors;
    return Array.isArray(collectors) ? collectors : [];
}

/**
 * @param {Collector[]} collectors
 * @returns {Promise<void>}
 */
export async function saveCollectors(collectors) {
    /** @type {CollectorsStorage} */
    const payload = {collectors};
    await chrome.storage.local.set({[COLLECTORS_STORAGE_KEY]: payload});
}

/**
 * @param {string} id
 * @returns {Promise<Collector | undefined>}
 */
export async function getCollectorById(id) {
    const collectors = await getCollectors();
    return collectors.find((c) => c.id === id);
}

/**
 * @param {Collector} collector
 * @returns {Promise<void>}
 */
export async function upsertCollector(collector) {
    const collectors = await getCollectors();
    const index = collectors.findIndex((c) => c.id === collector.id);
    if (index === -1) {
        collectors.push(collector);
    } else {
        collectors[index] = collector;
    }
    await saveCollectors(collectors);
}

/**
 * Deletes the collector and all websites assigned to it.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteCollector(id) {
    const websites = await getWebsites();
    await saveWebsites(websites.filter((w) => w.collector_id !== id));
    const collectors = await getCollectors();
    await saveCollectors(collectors.filter((c) => c.id !== id));
}
