/**
 * Public API returned by `startBrowserSdk`. Without a manager (SDK disabled
 * or failed to start) both methods are no-ops.
 * @param {UserManager | undefined} manager
 * @returns {UserApi}
 */
export function createUserApi(manager: UserManager | undefined): UserApi;
/** @typedef {import('@opentelemetry/sdk-trace').SpanProcessor} SpanProcessor */
/**
 * @typedef {Object} UserIdentity
 * @property {string} id
 * @property {string} [email]
 * @property {string} [name]
 * @property {string} [account]
 * @property {Record<string, string | number | boolean>} [attributes] Custom
 *  attributes, added with the `elastic.user.attributes.` prefix.
 */
/**
 * @typedef {Object} UserApi
 * @property {(user: UserIdentity) => void} setUser
 * @property {() => void} clearUser
 */
/**
 * Holds the identity of the current end-user. It is applied to spans and log
 * records by the processors below, so it can change at any time (for example
 * on login or logout), unlike resource attributes.
 */
export class UserManager {
    /** @type {import('@opentelemetry/api').Attributes} */
    _attributes: import("@opentelemetry/api").Attributes;
    /**
     * Replaces the current identity. Requires a non-empty `id`; optional
     * fields that are not non-empty strings are ignored. Entries of
     * `attributes` must have a non-empty key and a string, finite number or
     * boolean value, others are ignored.
     * @param {UserIdentity} user
     */
    setUser(user: UserIdentity): void;
    /** Removes the identity set with {@link UserManager.setUser}. */
    clearUser(): void;
    /** @returns {import('@opentelemetry/api').Attributes} */
    getAttributes(): import("@opentelemetry/api").Attributes;
}
/**
 * Adds user attributes on span start.
 * @implements {SpanProcessor}
 */
export class UserSpanProcessor implements SpanProcessor {
    /** @param {UserManager} manager */
    constructor(manager: UserManager);
    _manager: UserManager;
    /** @param {import('@opentelemetry/sdk-trace').Span} span */
    onStart(span: import("@opentelemetry/sdk-trace").Span): void;
    onEnd(): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
/**
 * Adds user attributes on log emit. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 */
export class UserLogRecordProcessor {
    /** @param {UserManager} manager */
    constructor(manager: UserManager);
    _manager: UserManager;
    /** @param {{setAttributes: (attrs: import('@opentelemetry/api').Attributes) => unknown}} logRecord */
    onEmit(logRecord: {
        setAttributes: (attrs: import("@opentelemetry/api").Attributes) => unknown;
    }): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
export type SpanProcessor = import("@opentelemetry/sdk-trace").SpanProcessor;
export type UserIdentity = {
    id: string;
    email?: string | undefined;
    name?: string | undefined;
    account?: string | undefined;
    /**
     * Custom
     * attributes, added with the `elastic.user.attributes.` prefix.
     */
    attributes?: Record<string, string | number | boolean> | undefined;
};
export type UserApi = {
    setUser: (user: UserIdentity) => void;
    clearUser: () => void;
};
