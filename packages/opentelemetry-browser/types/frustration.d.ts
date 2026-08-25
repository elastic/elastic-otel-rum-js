/**
 * True when `el` or an ancestor is a typical interactive control.
 *
 * @param {Element | null} el
 * @returns {boolean}
 */
export function isInteractiveElement(el: Element | null): boolean;
/**
 * Stable-enough XPath for frustration targeting (not a full XPath 1.0 serializer).
 *
 * @param {Element | null} el
 * @returns {string}
 */
export function xpathForElement(el: Element | null): string;
/**
 * Count rage bursts: ≥`threshold` clicks on the same target within `windowMs`.
 *
 * @param {Array<{xpath: string, ts: number}>} clicks
 * @param {number} [windowMs]
 * @param {number} [threshold]
 * @returns {number}
 */
export function countRageBursts(clicks: Array<{
    xpath: string;
    ts: number;
}>, windowMs?: number, threshold?: number): number;
/** Start click/error listeners that emit frustration logs. */
export function startFrustration(): void;
/** Remove frustration listeners. */
export function stopFrustration(): void;
export const EVENT_RAGE_CLICK: "browser.frustration.rage_click";
export const EVENT_DEAD_CLICK: "browser.frustration.dead_click";
export const EVENT_ERROR_CLICK: "browser.frustration.error_click";
