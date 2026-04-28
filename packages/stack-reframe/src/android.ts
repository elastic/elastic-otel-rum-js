/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AndroidSourceMap {
  
}

export async function retraceAndroid(stackTrace: string, sourceMap: AndroidSourceMap): Promise<string> {
  
  return Promise.resolve('foo');
}