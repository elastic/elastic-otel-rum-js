/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {test} from 'node:test';

import {getBrowserInfo, getPlatformInfo} from '../../lib/detector.js';

// For this tests we have collected a dataset from a public repository and run a tool
// similar to the user agent processor. The results are stored here to prvide use cases for our unit tests.
// The goal is not to make a 100% but to be good enough.
// References:
// - user agent processor https://www.elastic.co/docs/reference/enrich-processor/user-agent-processor
// - data set for tests https://github.com/EngineeringSample/UserAgentsDatabase/blob/main/BreadcrumbsUserAgentsDatabase.txt

// Test for each fixture
[
    ['baseline', 0.75],
    ['advanced', 0.5],
].forEach((spec) => {
    const [testType, threshold] = spec;
    test(`getBrowserInfo ${testType} - should get the right browser name`, () => {
        const fixturesPath = join(
            import.meta.dirname,
            `./fixtures/browser-${testType}.json`
        );
        const userAgentList = JSON.parse(
            readFileSync(fixturesPath, {encoding: 'utf-8'})
        );

        const stats = {
            total: 0,
            detected: 0,
            success: 0,
            fail: 0,
            ratio: 0,
        };
        const errors = [];

        for (const item of userAgentList) {
            const {ua, expect} = item;
            const detected = getBrowserInfo(ua);

            stats.total++;
            if (!detected) continue;
            stats.detected++;

            const actual = detected.name;
            // We will be more relaxed in matches:
            // - "Mobile X" is considered just "X" since we are sending the `isMobile` attribute
            // - "Opera X" is considered just "Opera"
            // - "Edge X" is considered just "Edge"
            expect.name = expect.name.replace('Mobile ', '');

            if (expect.name.startsWith('Opera')) {
                expect.name = 'Opera';
            } else if (expect.name.startsWith('Edge')) {
                expect.name = 'Edge';
            }

            if (expect.name === actual) {
                stats.success++;
            } else {
                errors.push({
                    actual,
                    expected: expect.name,
                    ua,
                    v: expect.version,
                });
                stats.fail++;
            }
        }
        stats.ratio = stats.success / stats.detected;
        // Uncomment this log message to get a sample of the failing detections
        // console.log(errors.slice(0, 50));
        console.log(stats);
        assert.ok(
            // @ts-expect-error
            stats.ratio >= threshold,
            `Browser tests(${testType}): Browser names detected are not good enough (ratio: ${stats.ratio}, threshold: ${threshold})`
        );
    });
});

test('getPlatformInfo - should get the right platform name', () => {
    const osFixturesPath = join(
        import.meta.dirname,
        './fixtures/os-baseline.json'
    );
    const userAgentList = JSON.parse(
        readFileSync(osFixturesPath, {encoding: 'utf-8'})
    );

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
        const {ua, expect} = item;
        const detected = getPlatformInfo(ua);

        if (!expect.name) continue;

        stats.total++;
        if (!detected) continue;
        stats.detected++;

        const actual = detected.name;
        const expected = linuxFlavors.includes(expect.name)
            ? 'Linux'
            : expect.name;

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
    const threshold = 0.95;
    assert.ok(
        stats.ratio >= threshold,
        `Platform names detected are not good enough (ratio: ${stats.ratio}, threshold: ${threshold})`
    );
});
