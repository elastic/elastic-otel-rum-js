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
/** Monotonic session generation (1 after init, increments on each rotate). */
export function getSessionSequence(): number;
/**
 * Optional callback after this tab rotates (or adopts a rotate from another tab).
 *
 * @param {((newId: string) => void) | null} fn
 */
export function setSessionOnRotate(fn: (newId: string) => void): void;
/**
 * @returns {{maxMs: number, idleMs: number, persistSession: boolean}}
 */
export function getSessionConfig(): {
    maxMs: number;
    idleMs: number;
    persistSession: boolean;
};
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
