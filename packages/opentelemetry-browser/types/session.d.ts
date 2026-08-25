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
/** True after idle timeout until the next user action starts a new session. */
export function isSessionPaused(): boolean;
/**
 * Optional callback after this tab rotates (or adopts a rotate from another tab).
 *
 * @param {((newId: string) => void) | null} fn
 */
export function setSessionOnRotate(fn: ((newId: string) => void) | null): void;
/** Fired when idle timeout pauses capture (session id unchanged). */
export function setSessionOnIdle(fn: (() => void) | null): void;
/** Fired when user activity resumes capture after idle (id already rotated). */
export function setSessionOnResume(fn: (() => void) | null): void;
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
