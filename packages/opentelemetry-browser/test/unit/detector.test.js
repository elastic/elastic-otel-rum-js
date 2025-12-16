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
    console.log(errors.slice(0,50))
    console.log(stats)
    console.log('ratio', (stats.success/stats.detected).toFixed(2));
    // TODO: add a treshold???
    assert.strictEqual(stats.fail, 0);
});

test('getPlatformInfo - should get the right platform name', () => {
    const stats = {
        total: 0,
        detected: 0,
        success: 0,
        fail: 0,
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
        const expected = parsed.os.name;

        if (expected === actual) {
            stats.success++;
        } else {
            errors.push({actual, expected, ua})
            stats.fail++;
        }

    }
    console.log(errors.slice(0,50))
    console.log(stats)
    console.log('ratio', (stats.success/stats.detected).toFixed(2));
    // TODO: add a treshold???
    assert.strictEqual(stats.fail, 0);
});