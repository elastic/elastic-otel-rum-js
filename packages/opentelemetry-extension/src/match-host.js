/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {import('./types/websites.js').MonitoredWebsite} MonitoredWebsite */

/**
 * @param {string | undefined} tabHostname
 * @param {string} configuredHost
 * @returns {boolean}
 */
export function hostMatches(tabHostname, configuredHost) {
    if (!tabHostname || !configuredHost) {
        return false;
    }
    const normalizedTab = tabHostname.toLowerCase();
    const normalizedConfig = configuredHost.toLowerCase().trim();
    if (normalizedTab === normalizedConfig) {
        return true;
    }
    return normalizedTab.endsWith(`.${normalizedConfig}`);
}

/**
 * @param {URL} url
 * @param {MonitoredWebsite[]} websites
 * @returns {MonitoredWebsite | undefined}
 */
export function findWebsiteForUrl(url, websites) {
    const hostname = url.hostname;
    return websites.find((site) => hostMatches(hostname, site.host));
}
