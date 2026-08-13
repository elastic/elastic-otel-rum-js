/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/** Default replay log body budget. Stays under typical OTLP/HTTP limits. */
export const DEFAULT_MAX_CHUNK_BYTES = 256 * 1024;

/**
 * Split a string into UTF-8 byte-bounded pieces (no mid-codepoint cuts).
 *
 * @param {string} str
 * @param {number} [maxBytes]
 * @returns {string[]}
 */
export function splitUtf8(str, maxBytes = DEFAULT_MAX_CHUNK_BYTES) {
    if (maxBytes <= 0) {
        return [str];
    }
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    if (bytes.length <= maxBytes) {
        return [str];
    }
    const decoder = new TextDecoder();
    /** @type {string[]} */
    const chunks = [];
    let offset = 0;
    while (offset < bytes.length) {
        let end = Math.min(offset + maxBytes, bytes.length);
        if (end < bytes.length) {
            while (end > offset && (bytes[end] & 0xc0) === 0x80) {
                end -= 1;
            }
            if (end === offset) {
                end = Math.min(offset + maxBytes, bytes.length);
            }
        }
        chunks.push(decoder.decode(bytes.subarray(offset, end)));
        offset = end;
    }
    return chunks;
}
