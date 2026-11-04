/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import semver from 'semver';

/**
 * @param {Record<string, unknown>} edotInfo
 * @returns {{edotVersion: string; otelInstrVersion: string} | {error: string}}
 */
export function getVersionsFromEdotPackage(edotInfo) {
    const edotVersion = edotInfo.version;
    const otelInstrVersionRaw =
        edotInfo.dependencies['@opentelemetry/browser-instrumentation'];
    const otelInstrSemVer = semver.coerce(otelInstrVersionRaw);

    if (!otelInstrSemVer) {
        return {error: String(otelInstrVersionRaw)};
    }

    return {
        edotVersion: String(edotVersion),
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
 * @param {Record<string, unknown>} edotInfo
 * @param {string} versionFileContent
 */
export function generateVersionFile(edotInfo, versionFileContent) {
    const versions = getVersionsFromEdotPackage(edotInfo);
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

    const edotPkgPath = `${EDOT_PATH}/package.json`;
    const edotInfo = JSON.parse(readFileSync(edotPkgPath, {encoding: 'utf-8'}));

    const result = generateVersionFile(
        edotInfo,
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
