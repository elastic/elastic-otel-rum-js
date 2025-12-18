/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { resourceFromAttributes } from '@opentelemetry/resources';
import { SDK_INFO } from '@opentelemetry/core';
import { ATTR_BROWSER_BRANDS, ATTR_BROWSER_LANGUAGE, ATTR_BROWSER_MOBILE, ATTR_BROWSER_PLATFORM, ATTR_USER_AGENT_ORIGINAL } from './semconv.js';

/**
 * @typedef {Object} UserAgentData
 * @property {{brand: string; version: string}[]} brands
 * @property {string} platform
 */

/**
 * @template T
 * @typedef {T | Array<T | undefined | null>} MaybeArray<T>
 */
/**
 * @typedef {MaybeArray<number> | MaybeArray<boolean> | MaybeArray<string>} AttributeValue
 */


/**
 * @param {Record<string, AttributeValue>} attribs
 * @param {string | undefined} serviceName
 * @param {string | undefined} serviceVersion
 * @returns {import('@opentelemetry/resources').Resource}
 */
export function detectResource(attribs, serviceName, serviceVersion) {
    /** @type {MaybeArray<number>} */
    if (typeof serviceName === 'string' && serviceName) {
        attribs['service.name'] = serviceName;
    }
    if (typeof serviceVersion === 'string' && serviceVersion) {
        attribs['service.version'] = serviceVersion;
    }

    /** @type {Navigator & { userAgentData?: UserAgentData }} */
    const { userAgent, userAgentData } = navigator;
    const browserInfo = getBrowserInfo(userAgent);
    let platform;

    if (userAgentData) {
        platform = { name: userAgentData.platform, version: '' };
        attribs[ATTR_BROWSER_BRANDS] = userAgentData.brands.map(i => `${i.brand} ${i.version}`);
    } else {
        platform = getPlatformInfo(userAgent);
    }

    if (browserInfo) {
        attribs['browser.name'] = browserInfo.name;
        attribs['browser.version'] = browserInfo.version;
    }
    if (platform) {
        attribs[ATTR_BROWSER_PLATFORM] = platform.name;
    }

    attribs[ATTR_BROWSER_MOBILE] = navigator.userAgent.includes('Mobi');
    attribs[ATTR_BROWSER_LANGUAGE] = navigator.language;
    attribs[ATTR_USER_AGENT_ORIGINAL] = userAgent;
    attribs['telemetry.distro.name'] = 'elastic';
    // TODO: check how to keep versions up to date
    attribs['telemetry.distro.version'] = '0.1.0';

    // This might be usefull info
    // ['browser.touch_screen_enabled']: navigator.maxTouchPoints > 0,
    // ['network.effective_type']: navigator['networkInformation']?.effectiveType || 'unknown',
    // ['screen.width']: window.screen.width,
    // ['screen.height']: window.screen.height,
    // ['screen.size']: computeScreenSize(window.screen.width),

    return resourceFromAttributes({ ...attribs, ...SDK_INFO });
}

/**
 * We can always pull something like https://www.npmjs.com/package/ua-parser-js
 * but not for now.
 * @param {string} userAgent
 * @returns {{name: string; version: string} | undefined}
 */
export function getPlatformInfo(userAgent) {
    const platforms = [
        { name: 'Windows Phone', test: /Windows Phone (\d+(\.\d+)*)/i },
        { name: 'Windows', test: /Windows (\d+)/i },
        { name: 'Windows RT', test: /Windows NT (\d+(\.\d+)*).+ARM;/i },
        { name: 'Windows', test: /Windows NT (\d+\.\d+)/i },
        { name: 'iOS', test: /iPhone OS (\d+(_\d+)*)/i },
        { name: 'macOS', test: /Mac OS (\d+(_\d+)*)/i },
        { name: 'macOS', test: /Mac OS X (\d+(\.\d+)*)/i },
        { name: 'Android', test: /Android (\d+(\.\d+)*)/i },
        { name: 'Linux', test: /Linux (\d+)/i },
    ];

    for (const p of platforms) {
        const match = p.test.exec(userAgent);
        if (match) {
            const name = p.name;
            const version = match[1].replaceAll('_', '.');
            return { name, version };
        }
    }
}


/**
 * @param {string} userAgent
 * @returns {{name: string; version: string} | undefined}
 */
export function getBrowserInfo(userAgent) {
    // note: only get the major version
    const browsers = [
        // Special names (keep them?)
        { name: 'Coc Coc', test: /coc_coc_browser\/(\d+)/i },
        { name: 'Baidu', test: /bdbrowser\/(\d+(\.\d+)*)/i },
        { name: 'GSA', test: /GSA\/(\d+(\.\d+)*)/i },
        { name: 'Silk', test: /Silk\/(\d+(\.\d+)*)/i },
        { name: 'Yandex', test: /YaBrowser\/(\d+(\.\d+)*)/i },

        // The usual suspects
        { name: 'Edge', test: /Edg\/(\d+)/i },
        { name: 'Edge', test: /Edge\/(\d+)/i },
        { name: 'Opera', test: /OPR\/(\d+(\.\d+)*)/i },
        { name: 'Opera', test: /Opera\/(\d+(\.\d+)*)/i },
        { name: 'Chromium', test: /Chromium\/(\d+)/i },
        { name: 'Chrome', test: /Chrome\/(\d+)/i },
        { name: 'Chrome', test: /CriOS\/(\d+)/i },
        { name: 'Android Browser', test: /Android \d.+Safari\/(\d+)/i },
        { name: 'Firefox', test: /Firefox\/(\d+)/i },
        { name: 'Safari', test: /Safari\/(\d+)/i },
    ];

    for (const b of browsers) {
        const match = b.test.exec(userAgent);
        if (match) {
            const name = b.name;
            const version = match[1].replaceAll('_', '.');
            return { name, version };
        }
    }
}

// /**
//  * @param {number} screenWidth 
//  * @returns {'small' | 'medium' | 'large' | 'unknown'}
//  */
// function computeScreenSize (screenWidth) {
//     if (screenWidth <= 768) return 'small';
//     else if (screenWidth > 768 && screenWidth <= 1024) return 'medium';
//     else if (screenWidth > 1024) return 'large';

//     return 'unknown';
// };
