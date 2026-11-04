/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import semver from 'semver';

/** First line of `npm ls`: package name (optional scope) then @version. */
const EDOT_VERSION_RE = /^.*@([^\s]+)/;

/** Any line listing @opentelemetry/browser-instrumentation@version. */
const BROWSER_INSTRUMENTATION_VERSION_RE =
    /@opentelemetry\/browser-instrumentation@([^\s]+)/;

/**
 * @param {string} npmLsOutput output of `npm ls` in the EDOT package directory
 * @returns {{edotVersion: string; otelInstrVersion: string} | {error: string}}
 */
export function getVersionsFromNpmLsOutput(npmLsOutput) {
    const firstLine = npmLsOutput.split(/\r?\n/, 1)[0] ?? '';
    const edotMatch = firstLine.match(EDOT_VERSION_RE);
    const edotCoerced = edotMatch && semver.coerce(edotMatch[1]);
    if (!edotCoerced) {
        return {error: firstLine.trim()};
    }

    const instrMatch = npmLsOutput.match(BROWSER_INSTRUMENTATION_VERSION_RE);
    if (!instrMatch) {
        return {error: '@opentelemetry/browser-instrumentation'};
    }

    const otelInstrSemVer = semver.coerce(instrMatch[1]);
    if (!otelInstrSemVer) {
        return {error: instrMatch[1]};
    }

    return {
        edotVersion: edotCoerced.version,
        otelInstrVersion: otelInstrSemVer.version,
    };
}

/**
 * @param {string} fileContent
 * @param {string} edotVersion
 * @param {string} otelInstrVersion
 */
export function updateVersionFileContent(
    fileContent,
    edotVersion,
    otelInstrVersion
) {
    return fileContent
        .replace(/EDOT_VERSION = '[^']+'/, `EDOT_VERSION = '${edotVersion}'`)
        .replace(
            /OTEL_BROWSER_INSTRUMENTATION_VERSION = '[^']+'/,
            `OTEL_BROWSER_INSTRUMENTATION_VERSION = '${otelInstrVersion}'`
        );
}

/**
 * @param {string} npmLsOutput output of `npm ls` in the EDOT package directory
 * @param {string} versionFileContent
 */
export function generateVersionFile(npmLsOutput, versionFileContent) {
    const versions = getVersionsFromNpmLsOutput(npmLsOutput);
    if ('error' in versions) {
        return {error: versions.error};
    }
    return {
        content: updateVersionFileContent(
            versionFileContent,
            versions.edotVersion,
            versions.otelInstrVersion
        ),
    };
}

const isMain =
    process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
    const SCRIPT_PATH = fileURLToPath(import.meta.url);
    const ROOT_PATH = join(SCRIPT_PATH, '../..');
    const EDOT_PATH = join(ROOT_PATH, 'packages/opentelemetry-browser');

    const npmLsOutput = readFileSync(0, {encoding: 'utf-8'});
    const result = generateVersionFile(
        npmLsOutput,
        readFileSync(`${EDOT_PATH}/lib/version.js`, {encoding: 'utf-8'})
    );

    if ('error' in result) {
        console.error(
            `Error: could not resolve browser instumentation version "${result.error}"`
        );
        process.exit(1);
    } else {
        console.log(`${result.content}`);
    }
}
