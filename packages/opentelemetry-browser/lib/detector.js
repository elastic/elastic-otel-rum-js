/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {resourceFromAttributes} from '@opentelemetry/resources';
import {SDK_INFO} from '@opentelemetry/core';
import {
    ATTR_BROWSER_BRANDS,
    ATTR_BROWSER_LANGUAGE,
    ATTR_BROWSER_MOBILE,
    ATTR_BROWSER_PLATFORM,
    ATTR_USER_AGENT_ORIGINAL,
} from './semconv.js';

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
    const {userAgent, userAgentData} = navigator;
    const browserInfo = getBrowserInfo(userAgent);
    let platform;

    if (userAgentData) {
        platform = {name: userAgentData.platform, version: ''};
        attribs[ATTR_BROWSER_BRANDS] = userAgentData.brands.map(
            (i) => `${i.brand} ${i.version}`
        );
    } else {
        platform = getPlatformInfo(userAgent);
    }

    if (browserInfo) {
        attribs['browser.name'] = browserInfo.name;
        if (browserInfo.version) {
            attribs['browser.version'] = browserInfo.version;
        }
    }
    if (platform) {
        attribs[ATTR_BROWSER_PLATFORM] = platform.name;
    }

    attribs[ATTR_BROWSER_MOBILE] = navigator.userAgent.includes('Mobi');
    attribs[ATTR_BROWSER_LANGUAGE] = navigator.language;
    attribs[ATTR_USER_AGENT_ORIGINAL] = userAgent;
    attribs['telemetry.distro.name'] = 'elastic';
    // TODO: check how to keep versions up to date
    // [trent] create a lint rule to check if this is in sync with package.json
    attribs['telemetry.distro.version'] = '0.1.0';

    // This might be usefull info
    // ['browser.touch_screen_enabled']: navigator.maxTouchPoints > 0,
    // ['network.effective_type']: navigator['networkInformation']?.effectiveType || 'unknown',
    // ['screen.width']: window.screen.width,
    // ['screen.height']: window.screen.height,
    // ['screen.size']: computeScreenSize(window.screen.width),

    return resourceFromAttributes({...attribs, ...SDK_INFO});
}

// -- helper functions
// ref: https://mdn2.netlify.app/en-us/docs/web/http/browser_detection_using_the_user_agent/#which_part_of_the_user_agent_contains_the_information_you_are_looking_for

/**
 * @param {string} userAgent
 * @returns {{name: string; version: string} | undefined}
 */
export function getPlatformInfo(userAgent) {
    /** @type {Array<[string,RegExp[]]>} */
    const platforms = [
        // {name: 'Firefox OS', test: /Firefox\/([\w\.]+)?/i},
        ['Symbian', [/SymbianOS\/([\w\.]+)/i]],
        ['Windows Phone', [/Windows Phone ([\w\.]+)/i]],
        ['Xbox', [/Xbox?/i]],
        ['Windows', [/Windows (\d+)/i]],
        ['Windows RT', [/Windows NT ([\w\.]+).+ARM;/i]],
        ['Windows', [/Windows NT (\d+\.\d+)/i]],
        ['Windows IoT', [/Windows IoT (\d+\.\d+)/i]],
        ['iOS', [/iPhone OS (\d+(_\d+)*)/i, /iPad;.+CPU OS (\d+(_\d+)*)/i]],
        [
            'macOS',
            [/Mac OS (\d+(_\d+)*)/i, /Mac OS X ([\w\.]+)/i, /Intel Mac OS X/],
        ],
        ['Ubuntu Touch', [/Ubuntu ([\w\.]+).+Mobile/i]],
        ['Android', [/Android ([\w\.]+)/i, /Android;/i]],
        ['Linux', [/Linux ([\w_]+)/i, /Linux;/]],
    ];

    for (const p of platforms) {
        const [name, tests] = p;
        for (const t of tests) {
            const match = t.exec(userAgent);
            if (match) {
                let version;
                if (match[1]) {
                    version = match[1].replaceAll('_', '.');
                }
                return {name, version};
            }
        }
    }
}

/**
 * @param {string} userAgent
 * @returns {{name: string; version: string | undefined} | undefined}
 */
export function getBrowserInfo(userAgent) {
    // note: only get the major version
    /** @type {Array<[string, RegExp[]]>} */
    const browsers = [
        // Branded or inapp browsers
        ['AliPay', [/AliPayClient\/([\w\.]+)/i]],
        [
            'Baidu',
            [
                /bd(?:browser|spark)\/([\w\.]+)/i,
                /baidu(?:boxapp|hd)\/([\w\.]+)/i,
                /BIDUBrowser\/([\w\.]+)/i,
            ],
        ],
        ['Bing', [/Bing(?:Web|Sapphire)\/([\w\.]+)/i]],
        ['Camino', [/Camino\/([\w\.]+)/i]],
        ['Coc Coc', [/coc_coc_browser\/([\w\.]+)/i]],
        ['Dragon', [/(?:Dragon|Comodo_Dragon)\/([\w\.]+)/i]],
        ['DuckDuckGo', [/(?:Ddg|DuckDuckGo)\/([\w\.]+)/i]],
        ['Electron', [/Electron\/([\w\.]+)/i]],
        ['Facebook', [/;fbav\/([\w\.]+);/i, /(?:fban\/fbios|fb_iab\/fb4a)/i]],
        ['GSA', [/GSA\/([\w\.]+)/i]],
        ['Huawei Browser', [/HuaweiBrowser\/([\w\.]+)/i]],
        ['Iron', [/(?:Iron|Iron Safari)\/([\w\.]+)/i]],
        ['LG Browser', [/LG Browser\/([\w\.]+)/i]],
        ['Lunascape', [/Lunascape\/([\w\.]+)/i]],
        ['Maxthon', [/Maxthon\/([\w\.]+)/i, /Mx(?:Browser|iOS)\/([\w\.]+)/i]],
        ['MIUI Browser', [/MiuiBrowser\/([\w\.]+)/i]],
        ['NokiaBrowser', [/NokiaBrowser\/([\w\.]+)/i]],
        ['Oculus Browser', [/OculusBrowser\/([\w\.]+)/i]],
        ['Pico Browser', [/PicoBrowser\/([\w\.]+)/i]],
        ['Qwant', [/Qwant(?:Mobile|Browser|iOS)\/([\w\.]+)/i]],
        ['Samsung Internet', [/SamsungBrowser\/([\w\.]+)/i]],
        ['Silk', [/Silk\/([\w\.]+)/i]],
        ['Smart Lenovo Browser', [/SLBrowser\/([\w\.]+)/i]],
        ['Snapchat', [/Snapchat\/([\w\.]+)/i]],
        ['Steam', [/Valve Steam/i]],
        ['TikTok', [/musical_ly.+app_version\/([\w\.]+)/i]],
        ['Twitter', [/Twitter/i]],
        ['Vivaldi', [/Vivaldi\/([\w\.]+)/i]],
        ['Yandex', [/Ya(?:SearchBrowser|Browser)\/([\w\.]+)/i]],
        [
            'WeChat',
            [
                /microm.+\bqbcore\/([\w\.]+)/i,
                /\bqbcore\/([\w\.]+).+microm/i,
                /micromessenger\/([\w\.]+)/i,
            ],
        ],
        // Some wechat UAs contain qqbrowser so this should be last
        ['QQBrowser', [/M?QQbrowser\/([\w\.]+)/i]],

        // The usual suspects
        ['Brave', [/Brave\/([\w\.]+)/i]],
        ['Edge', [/(?:Edg|Edge|EdgA|EdgW|EdgiOS)\/([\w\.]+)/i]],
        ['Opera', [/(?:OPR|OPT|OPiOS|Opera)\/([\w\.]+)/i, /Coast\/([\w\.]+)/i]],
        ['Chromium', [/Chromium\/([\w\.]+)/i]],
        [
            'Chrome Headless',
            [/HeadlessChrome\/([\w\.]+)/i, /HeadlessChrome Safari\/([\w\.]+)/i],
        ],
        ['Chrome', [/Chrome\/([\w\.]+)/i, /Cr(?:iOS|Mo)\/([\w\.]+)/i]],
        ['Android Browser', [/Android \d.+Safari\/([\w\.]+)/i]],
        ['Firefox', [/(?:Firefox|FxiOS)\/([\w\.]+)/i]],
        ['Safari', [/Safari\/([\w\.]+)/i]],
    ];

    for (const b of browsers) {
        const [name, tests] = b;
        for (const t of tests) {
            const match = t.exec(userAgent);
            if (match) {
                let version;
                if (match[1]) {
                    version = match[1].replaceAll('_', '.');
                }
                return {name, version};
            }
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
