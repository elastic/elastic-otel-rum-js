/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {logs} from '@opentelemetry/api-logs';
import {OTLPLogExporter} from '@opentelemetry/exporter-logs-otlp-http';
import {BatchLogRecordProcessor, LoggerProvider} from '@opentelemetry/sdk-logs';
import { appendPath } from './utils.js';

/**
 * TODO: add processors as config option
 * @param {Object} config
 * @param {string} config.otlpEndpoint
 * @param {import('@opentelemetry/resources').Resource} config.resource
 * @param {Record<string, string>} [config.exportHeaders] // defaults to {}
 * 
 * @returns {{shutdown: () => Promise<void>}}
 */
export function withLogs(config) {
    // logs signal configuration
    const logsEndpoint = appendPath(config.otlpEndpoint, 'v1/logs').href;
    const logsProcessor = new BatchLogRecordProcessor(
        new OTLPLogExporter({
            url: logsEndpoint,
            headers: config.exportHeaders,
        })
    );
    const loggerProvider = new LoggerProvider({
        resource: config.resource,
        processors: [logsProcessor],
    });
    logs.setGlobalLoggerProvider(loggerProvider);

    return {
        shutdown: () => loggerProvider.shutdown(),
    };
}
