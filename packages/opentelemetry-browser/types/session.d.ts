/**
 * @param {{maxMs?: number, idleMs?: number, persistSession?: boolean}} [cfg]
 * @returns {string} session ID
 */
export function initSession(cfg?: {
    maxMs?: number;
    idleMs?: number;
    persistSession?: boolean;
}): string;
/** @returns {string | null} */
export function getSessionId(): string | null;
/**
 * @param {{maxMs?: number, idleMs?: number}} [cfg]
 * @param {(newId: string) => void} [onRotateFn]
 * @returns {boolean} whether rotation occurred
 */
export function checkRotation(cfg?: {
    maxMs?: number;
    idleMs?: number;
}, onRotateFn?: (newId: string) => void): boolean;
/**
 * Closes the BroadcastChannel, removes activity listeners, and resets module state.
 */
export function closeSession(): void;
