export type SamplingDecision = number;
export namespace SamplingDecision {
    let NOT_RECORD: number;
    let RECORD: number;
}
/**
 * @typedef {Object} SamplingResult
 * @property {SamplingDecision} decision
 */
/**
 *
 */
export class SessionSampler {
    /** @param {number} ratio */
    constructor(ratio: number);
    _ratio: number;
    get ratio(): number;
    /**
     * @param {string} sessionId
     * @returns {SamplingResult}
     */
    shouldSample(sessionId: string): SamplingResult;
    toString(): string;
}
export type SamplingResult = {
    decision: SamplingDecision;
};
