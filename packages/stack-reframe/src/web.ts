/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {RawSourceMap} from 'source-map';
// import {SourceMapConsumer} from 'source-map';


export async function retraceWeb(stackTrace: string, sourceMap: RawSourceMap): Promise<string> {
  // SourceMapConsumer.with(sourceMap, null, consumer => {
  //   consumer.
  // })
  return Promise.resolve('foo');
}