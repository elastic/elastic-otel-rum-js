/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SourceMapFetcher<SourceMapType> {
    fetch: (sources: string[]) => Promise<SourceMapType[]>;
}

/**
 * Minimal logger interface the retracer uses to surface diagnostic
 * warnings. Defaults to `console.warn`. Consumers (e.g. Kibana plugins)
 * can pass their own logger to integrate with their logging stack.
 */
export interface Logger {
    warn: (message: string) => void;
}

export interface RetracerOptions {
    logger?: Logger;
}

export abstract class Retracer<SourceMapType> {
    protected _stackTrace: string;
    protected _fetcher: SourceMapFetcher<SourceMapType>;
    protected _logger: Logger;

    constructor(
        stackTrace: string,
        sourceMapFetcher: SourceMapFetcher<SourceMapType>,
        options: RetracerOptions = {}
    ) {
        this._stackTrace = stackTrace;
        this._fetcher = sourceMapFetcher;
        this._logger = options.logger ?? {
            warn: (message) => console.warn(message),
        };
    }

    abstract retrace(): Promise<string | undefined>;
}
