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
 * We can always pull something like https://www.npmjs.com/package/ua-parser-js
 * but not for now.
 * @param {string} userAgent
 * @returns {{name: string; version: string} | undefined}
 */
export function getPlatformInfo(userAgent) {
    /** @type {Array<{name: string; test: RegExp}>} */
    const platforms = [
        {name: 'Windows Phone', test: /Windows Phone (\d+(\.\d+)*)/i},
        {name: 'Windows', test: /Windows (\d+)/i},
        {name: 'Windows RT', test: /Windows NT (\d+(\.\d+)*).+ARM;/i},
        {name: 'Windows', test: /Windows NT (\d+\.\d+)/i},
        {name: 'Windows IoT', test: /Windows IoT (\d+\.\d+)/i},
        {name: 'iOS', test: /iPhone OS (\d+(_\d+)*)/i},
        {name: 'macOS', test: /Mac OS (\d+(_\d+)*)/i},
        {name: 'macOS', test: /Mac OS X (\d+(\.\d+)*)/i},
        {name: 'Android', test: /Android (\d+(\.\d+)*)/i},
        {name: 'Linux', test: /Linux (\d+)/i},
    ];

    for (const p of platforms) {
        const match = p.test.exec(userAgent);
        if (match) {
            const name = p.name;
            const version = match[1].replaceAll('_', '.');
            return {name, version};
        }
    }
}

/**
 * @param {string} userAgent
 * @returns {{name: string; version: string | undefined} | undefined}
 */
export function getBrowserInfo(userAgent) {
    // note: only get the major version
    /** @type {Array<{name: string; test: MaybeArray<RegExp>}>} */
    const browsers = [
        // Special names
        // TODO: make use of non capturing grops
        {name: 'AliPay', test: /AliPayClient\/(\d+(\.\d+)*)/i},
        {name: 'Baidu', test: [/bdbrowser\/(\d+(\.\d+)*)/i, /baiduboxapp\/(\d+)/i, /BIDUBrowser\/(\d+)/i, /BaiduHD\/(\d+)/i, /BDSpark\/(\d+)/i] },
        {name: 'Bing', test: [/BingSapphire\/(\d+)/i, /BingWeb\/(\d+)/i]},
        {name: 'Camino', test: /Camino\/(\d+)/i},
        {name: 'Coc Coc', test: /coc_coc_browser\/(\d+)/i},
        {name: 'Dragon', test: [/Comodo_Dragon\/(\d+)/i, /Dragon\/(\d+)/i]},
        {name: 'DuckDuckGo', test: [/DuckDuckGo\/(\d+)/i, /Ddg\/(\d+)/i]},
        {name: 'Electron', test: /Electron\/(\d+(\.\d+)*)/i},
        {name: 'Facebook', test: [/;fbav\/([\w\.]+);/i,/(?:fban\/fbios|fb_iab\/fb4a)/i]},
        {name: 'GSA', test: /GSA\/(\d+(\.\d+)*)/i},
        {name: 'Huawei Browser', test: /HuaweiBrowser\/(\d+)/i},
        {name: 'Iron', test: [/Iron\/(\d+(\.\d+)*)/i, /Iron Safari\/(\d+(\.\d+)*)/i]},
        {name: 'LG Browser', test: /LG Browser\/(\d+(\.\d+)*)/i},
        {name: 'Lunascape', test: /Lunascape\/(\d+(\.\d+)*)/i},
        {name: 'Maxthon', test: [/Maxthon\/(\d+(\.\d+)*)/i, /Mx(:?Browser|iOS)\/(\d+(\.\d+)*)/i]},
        {name: 'MIUI Browser', test: /MiuiBrowser\/(\d+(\.\d+)*)/i},
        {name: 'NokiaBrowser', test: /NokiaBrowser\/(\d+(\.\d+)*)/i},
        {name: 'Oculus Browser', test: /OculusBrowser\/(\d+(\.\d+)*)/i},
        {name: 'Pico Browser', test: /PicoBrowser\/(\d+(\.\d+)*)/i},
        {name: 'Qwant', test: /Qwant(:?Mobile|Browser|iOS)\/(\d+(\.\d+)*)/i},
        {name: 'Samsung Internet', test: /SamsungBrowser\/(\d+(\.\d+)*)/i},
        {name: 'Silk', test: /Silk\/(\d+(\.\d+)*)/i},
        {name: 'Smart Lenovo Browser', test: /SLBrowser\/(\d+(\.\d+)*)/i},
        {name: 'Snapchat', test: /Snapchat\/(\d+(\.\d+)*)/i},
        {name: 'Steam', test: /Valve Steam/i},
        {name: 'TikTok', test: /musical_ly.+app_version\/(\d+(\.\d+)*)/i},
        {name: 'Twitter', test: /Twitter/i},
        {name: 'Vivaldi', test: /Vivaldi\/(\d+(\.\d+)*)/i},
        {name: 'Yandex', test: /Ya(:?SearchBrowser|Browser)\/(\d+(\.\d+)*)/i},
        {name: 'WeChat', test: /microm.+\bqbcore\/([\w\.]+)/i},
        {name: 'WeChat', test: /\bqbcore\/([\w\.]+).+microm/i},
        {name: 'WeChat', test: /micromessenger\/([\w\.]+)/i},
        // Some wechat UAs contain qqbrowser
        {name: 'QQBrowser', test: /M?QQbrowser\/(\d+(\.\d+)*)/i},

        // The usual suspects
        {name: 'Brave', test: /Brave\/(\d+(\.\d+)*)/i},
        {name: 'Edge', test: /(?:Edg|Edge|EdgA|EdgW|EdgiOS)\/(\d+)/i},
        {name: 'Opera', test: [/(?:OPR|OPT|OPiOS|Opera)\/(\d+(\.\d+)*)/i, /Coast\/([\w\.]+)/i]},
        {name: 'Chromium', test: /Chromium\/(\d+)/i},
        {name: 'Chrome', test: [/Chrome\/(\d+)/i, /Cr(:?iOS|Mo)\/(\d+)/i]},
        {name: 'Chrome Headless', test: [/HeadlessChrome\/(\d+)/i, /HeadlessChrome Safari\/(\d+)/i]},        
        {name: 'Android Browser', test: /Android \d.+Safari\/(\d+)/i},
        {name: 'Firefox', test: /(?:Firefox|FxiOS)\/(\d+)/i},
        {name: 'Safari', test: /Safari\/(\d+)/i},
    ];

    for (const b of browsers) {
        const tests = Array.isArray(b.test) ? b.test : [b.test];
        let match;

        for (const t of tests) {
            match = t.exec(userAgent);
            if (match) {
                const name = b.name;
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
