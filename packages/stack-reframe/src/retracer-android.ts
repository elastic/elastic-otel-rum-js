/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Retracer } from "./retracer.js";

export interface AndroidSourceMap {}

export class RetracerAndroid extends Retracer<AndroidSourceMap> {
    async retrace(): Promise<string | undefined> {
        const files = ['a', 'b']
        const sourcemaps = await this._fetcher.fetch(files);
    
        return '';
    }
}


export async function retraceAndroid(
    stackTrace: string,
    sourceMaps: AndroidSourceMap[]
): Promise<string> {
    return Promise.resolve('foo');
}
