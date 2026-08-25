/**
 * Stamp the current end-user on subsequent traces and logs (`user.id` /
 * `user.email` / `user.name`). Requires `id`.
 *
 * @param {UserIdentity} user
 * @returns {void}
 */
export function setUser(user: UserIdentity): void;
/** Clear identity attributes previously set with {@link setUser}. */
export function clearUser(): void;
/** @returns {UserIdentity | null} */
export function getUser(): UserIdentity | null;
/**
 * Resource/span/log attributes for the current user, or `{}` if none.
 *
 * @returns {Record<string, string>}
 */
export function getUserAttributes(): Record<string, string>;
export type UserIdentity = {
    id: string;
    email?: string;
    name?: string;
};
