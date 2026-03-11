/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {logs} from '@opentelemetry/api-logs';
import {OTLPLogExporter} from '@opentelemetry/exporter-logs-otlp-http';
import {BatchLogRecordProcessor, LoggerProvider} from '@opentelemetry/sdk-logs';

import {appendPath} from './utils.js';

/** @type {LoggerProvider} */
let _loggerProvider;
/**
 * @typedef {Object} LogsSdkConfig
 * @property {string} otlpEndpoint
 * @property {Record<string, string>} exportHeaders
 * @property {import('@opentelemetry/resources').Resource} resource
 */

/** @type {import('./sdk.js').WebSdk<LogsSdkConfig>} */
export const LogsSdk = {
    init(config) {
        const logsEndpoint = appendPath(config.otlpEndpoint, 'v1/logs').href;
        const logsProcessor = new BatchLogRecordProcessor(
            new OTLPLogExporter({
                url: logsEndpoint,
                headers: config.exportHeaders,
            })
        );
        _loggerProvider = new LoggerProvider({
            resource: config.resource,
            processors: [logsProcessor],
        });
        logs.setGlobalLoggerProvider(_loggerProvider);
    },
    forceFlush() {
        if (_loggerProvider) {
            return _loggerProvider.forceFlush();
        }
        return Promise.resolve();
    },
};
