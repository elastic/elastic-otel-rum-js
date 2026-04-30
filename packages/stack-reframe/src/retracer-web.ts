/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {RawSourceMap} from 'source-map';
import {SourceMapConsumer} from 'source-map';
import * as stackTraceParser from 'stacktrace-parser';
import { Retracer } from './retracer.js';


export class RetracerWeb extends Retracer<RawSourceMap> {
    async retrace(): Promise<string | undefined> {
        const stackLines = this._stackTrace.split('\n');
        const errorLine = stackLines.shift();
        const stackFrames = stackLines.map(l => ({
            content: l,
            parsed: stackTraceParser.parse(l)[0],
        }));
        const files = stackFrames.map(f => f.parsed?.file).filter(f => f) as string[];

        let sourceMaps: RawSourceMap[];
        try {
            sourceMaps = await this._fetcher.fetch(files);
        } catch (err) {
            // Do something with err
            return this._stackTrace;
        }

        // Obviously we have nothing to do without sourcemaps
        if (sourceMaps.length === 0) {
            return this._stackTrace;
        }

        // Map consumers since they can be used several times
        const consumersMap = new Map<string, SourceMapConsumer>();
        for (const sourceMap of sourceMaps) {
            const consumer = await new SourceMapConsumer(sourceMap);
            consumersMap.set(sourceMap.file, consumer);
        }

        const decodedFrames = [];
        for (const frame of stackFrames) {
            if (!frame.parsed) {
                decodedFrames.push(frame.content); // Skip if cannot be parsed
                continue;
            }

            const {methodName, file, lineNumber, column} = frame.parsed;
            // Skip if no line/column found
            if (!lineNumber || !column) {
                decodedFrames.push(frame.content);
                continue;
            }

            const consumer = consumersMap.get(file || '<unknow>');
            // Skip if no consumer (no source map)
            if (!consumer) {
                decodedFrames.push(frame.content);
                continue;
            }

            const originalPosition = consumer.originalPositionFor({line: lineNumber, column});
            if (originalPosition.source) {
                decodedFrames.push(`  at ${originalPosition.name || methodName} (${originalPosition.source}:${originalPosition.line}:${originalPosition.column})`);
            } else {
                decodedFrames.push(frame.content);
            }
        }

        // Cleanup
        consumersMap.forEach((consumer) => consumer.destroy());
        consumersMap.clear();

        return [errorLine, ...decodedFrames].join('\n');
    }
    
}


// export async function retraceWeb(
//     stackTrace: string,
//     sourceMaps: RawSourceMap[]
// ): Promise<string> {
//     // Obviously we have nothing to do without sourcemaps
//     if (sourceMaps.length === 0) {
//         return stackTrace;
//     }
    
//     const stackLines = stackTrace.split('\n');
//     const errorLine = stackLines.shift();
//     const stackFrames = stackLines.map(l => ({
//         content: l,
//         parsed: stackTraceParser.parse(l)[0],
//     }));

//     const decodedFrames = [];
//     for (const frame of stackFrames) {
//         if (!frame.parsed) {
//             decodedFrames.push(frame.content); // Skip if cannot be parsed
//             continue;
//         }

//         const {methodName, file, lineNumber, column} = frame.parsed;
//         const sourceMap = sourceMaps.find((sm) => sm.file === file);
//         // Skip if no sourcemap available
//         if (!sourceMap) {
//             decodedFrames.push(frame.content); 
//             continue;
//         }
//         // Skip if no line/column found
//         if (!lineNumber || !column) {
//             decodedFrames.push(frame.content);
//             continue;
//         }
//         const consumer = await new SourceMapConsumer(sourceMap);
//         const originalPosition = consumer.originalPositionFor({line: lineNumber, column});
//         consumer.destroy(); // Clean up memory

//         if (originalPosition.source) {
//             decodedFrames.push(`  at ${originalPosition.name || methodName} (${originalPosition.source}:${originalPosition.line}:${originalPosition.column})`);
//         }
//     }

//     return [errorLine, ...decodedFrames].join('\n');
//     // const stackFrames = stackTrace.split('\n');
//     // const firstFrame = stackFrames.shift();
//     // const decodedFrames = [];

//     // for (const frame of stackFrames) {
//     //     // Regex to extract minified file URL, line, and column (adjust for browser differences)
//     //     // or use https://github.com/errwischt/stacktrace-parser (MIT)
//     //     const match = frame.match(/at (.*?) \((.*?):(\d+):(\d+)\)/);
//     //     if (!match) {
//     //         decodedFrames.push(frame); // Skip unparseable frames
//     //         continue;
//     //     }

//     //     const [, functionName, fileUrl, lineStr, columnStr] = match;
//     //     const line = parseInt(lineStr, 10);
//     //     const column = parseInt(columnStr, 10);
//     //     const sourceMap = sourceMaps.find((sm) => sm.file === fileUrl);

//     //     if (!sourceMap) {
//     //         decodedFrames.push(frame); // Skip if no sourcemap available
//     //         continue;
//     //     }
//     //     const consumer = await new SourceMapConsumer(sourceMap);
//     //     const originalPosition = consumer.originalPositionFor({line, column});
//     //     consumer.destroy(); // Clean up memory

//     //     if (originalPosition.source) {
//     //         decodedFrames.push(`  at ${originalPosition.name || functionName} (${originalPosition.source}:${originalPosition.line}:${originalPosition.column})`);
//     //     }
//     // }

//     // return [firstFrame, ...decodedFrames].join('\n');
// }
