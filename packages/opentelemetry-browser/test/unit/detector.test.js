/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {test} from 'node:test';

import {UAParser} from 'ua-parser-js';
import {getBrowserInfo, getPlatformInfo} from '../../lib/detector.js';

// Check that our simpler version of parsing the user agent is good enough. We are comparing to a well
// know solution https://www.npmjs.com/package/ua-parser-js and using a dataset from github
// https://github.com/EngineeringSample/UserAgentsDatabase/blob/main/BreadcrumbsUserAgentsDatabase.txt

// TODO: crawl data from https://explore.whatismybrowser.com/useragents/explore/
// software and OS categories
// check https://github.com/microlinkhq/top-user-agents

// USE => https://github.com/ua-parser/uap-core/

// https://github.com/faisalman/ua-parser-js/blob/master/test/data/ua/browser/browser-all.json

const fixturesPath = join(
    import.meta.dirname,
    './fixtures/browser-all.json'
);
const userAgentList = JSON.parse(readFileSync(fixturesPath, {encoding: 'utf-8'}));

test('getBrowserInfo - should get the right browser name', () => {
    const excludedBrowsers = ['IE', 'IEMobile'];
    const stats = {
        total: 0,
        detected: 0,
        success: 0,
        fail: 0,
        ratio: 0,
    };
    const errors = [];

    for (const item of userAgentList) {
        const {ua} = item;
        const parsed = UAParser(ua);
        const detected = getBrowserInfo(ua);

        if (!parsed.browser.name) continue;
        if (excludedBrowsers.includes(parsed.browser.name)) continue;
        stats.total++;
        if (!detected) continue;
        stats.detected++;

        const actual = detected.name;
        // We will be more relaxed in matches:
        // - "Mobile X" is considered just "X" since we are sending the `isMobile` attribute
        // - "Opera X" is considered jusnt "Opera"
        
        let expected = parsed.browser.name.replace('Mobile ', '');
        if (expected.startsWith('Opera')) {
            expected = 'Opera';
        }

        if (expected === actual) {
            stats.success++;
        } else {
            errors.push({actual, expected, ua});
            stats.fail++;
        }
    }
    stats.ratio = stats.success / stats.detected;
    // Uncomment this log message to get a sample of the failing detections
    // console.log(errors.slice(0, 50));
    console.log(errors);
    console.log(stats);
    const treshold = 0.75;
    assert.ok(
        stats.ratio >= treshold,
        `Browser names detected are not good enough (ratio: ${stats.ratio}, treshold: ${treshold})`
    );
});

test('getPlatformInfo - should get the right platform name', () => {
    const linuxFlavors = ['Kubuntu', 'ubuntu', 'Debian'];
    const stats = {
        total: 0,
        detected: 0,
        success: 0,
        fail: 0,
        ratio: 0,
    };
    const errors = [];

    for (const item of userAgentList) {
        const {ua} = item;
        const parsed = UAParser(ua);
        const detected = getPlatformInfo(ua);

        if (!parsed.os.name) continue;

        stats.total++;
        if (!detected) continue;
        stats.detected++;

        const actual = detected.name;
        const expected = linuxFlavors.includes(parsed.os.name)
            ? 'Linux'
            : parsed.os.name;

        if (expected === actual) {
            stats.success++;
        } else {
            errors.push({actual, expected, ua});
            stats.fail++;
        }
    }
    stats.ratio = stats.success / stats.detected;
    // Uncomment this log message to get a sample of the failing detections
    // console.log(errors.slice(0,50))
    console.log(stats);
    const treshold = 0.95;
    assert.ok(
        stats.ratio >= treshold,
        `Platform names detected are not good enough (ratio: ${stats.ratio}, treshold: ${treshold})`
    );
});
