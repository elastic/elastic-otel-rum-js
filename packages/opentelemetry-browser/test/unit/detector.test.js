/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import { test} from 'node:test';

import {UAParser} from 'ua-parser-js';
import {getBrowserInfo, getPlatformInfo} from '../../lib/detector.js';

// Check that our simpler version of parsing the user agent is good enough. We are comparing to a well
// know solution https://www.npmjs.com/package/ua-parser-js and using a dataset from github
// // https://github.com/EngineeringSample/UserAgentsDatabase/blob/main/BreadcrumbsUserAgentsDatabase.txt
const fixturesPath = join(import.meta.dirname, '../fixtures/BreadcrumbsUserAgentsDatabase.txt');
const contents = readFileSync(fixturesPath, { encoding: 'utf-8' });
const userAgentList = contents.split('\n');

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

    for (const ua of userAgentList) {
        const parsed = UAParser(ua);
        const detected = getBrowserInfo(ua);

        if (!parsed.browser.name) continue;
        if (excludedBrowsers.includes(parsed.browser.name)) continue;
        stats.total++;
        if (!detected) continue;
        stats.detected++;

        const actual = detected.name;
        const expected = parsed.browser.name.replace('Mobile ', '');

        if (expected === actual) {
            stats.success++;
        } else {
            errors.push({actual, expected, ua})
            stats.fail++;
        }
    }
    stats.ratio = stats.success/stats.detected;
    console.log(errors.slice(0,50))
    console.log(stats)
    const treshold = 0.75;
    assert.ok(stats.ratio >= treshold, `Browser names detected are not good enough (ratio: ${stats.ratio}, treshold: ${treshold})`);
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

    for (const ua of userAgentList) {
        const parsed = UAParser(ua);
        const detected = getPlatformInfo(ua);

        if (!parsed.os.name) continue;
        
        stats.total++;
        if (!detected) continue;
        stats.detected++;

        const actual = detected.name;
        const expected = linuxFlavors.includes(parsed.os.name) ? 'Linux' : parsed.os.name;

        if (expected === actual) {
            stats.success++;
        } else {
            errors.push({actual, expected, ua})
            stats.fail++;
        }

    }
    stats.ratio = stats.success/stats.detected;
    // console.log(errors.slice(0,50))
    console.log(stats)
    const treshold = 0.95;
    assert.ok(stats.ratio >= treshold, `Platform names detected are not good enough (ratio: ${stats.ratio}, treshold: ${treshold})`);
});