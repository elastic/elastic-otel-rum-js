/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SourceMapFetcher<SourceMapType> {
  fetch: (sources: string[]) => Promise<SourceMapType[]>
}


export abstract class Retracer<SourceMapType> {
  protected _stackTrace: string;
  protected _fetcher: SourceMapFetcher<SourceMapType>;

  constructor(stackTrace: string, sourceMapFetcher: SourceMapFetcher<SourceMapType>) {
    this._stackTrace = stackTrace;
    this._fetcher = sourceMapFetcher;
  }

  abstract retrace(): Promise<string | undefined>;
}