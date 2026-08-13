/**
 * Split a string into UTF-8 byte-bounded pieces (no mid-codepoint cuts).
 *
 * @param {string} str
 * @param {number} [maxBytes]
 * @returns {string[]}
 */
export function splitUtf8(str: string, maxBytes?: number): string[];
/** Default replay log body budget. Stays under typical OTLP/HTTP limits. */
export const DEFAULT_MAX_CHUNK_BYTES: number;
