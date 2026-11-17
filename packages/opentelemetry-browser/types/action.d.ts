/**
 * Public API returned by `startBrowserSdk`. Without a logger (SDK disabled or
 * failed to start) `addAction` is a no-op.
 * @param {import('@opentelemetry/api-logs').Logger | undefined} logger
 * @returns {ActionApi}
 */
export function createActionApi(logger: import("@opentelemetry/api-logs").Logger | undefined): ActionApi;
/**
 * @typedef {Object} ActionApi
 * @property {(
 *  name: string,
 *  attributes?: Record<string, ActionAttributeValue>
 * ) => void} addAction Records an app-defined event, such as a search or an
 *  add-to-cart. It is exported as a log event named `action.<name>`, with the given
 *  attributes and the usual session, user and page context.
 */
/** @typedef {string | number | boolean | string[] | number[] | boolean[]} ActionAttributeValue */
/** Longer names are rejected */
export const MAX_ACTION_NAME_LENGTH: 128;
/** Attributes beyond this count, and array items beyond it, are ignored */
export const MAX_ACTION_ITEMS: 20;
/** Longer string values are truncated */
export const MAX_ACTION_VALUE_LENGTH: 1024;
export type ActionApi = {
    /**
     * Records an app-defined event, such as a search or an
     * add-to-cart. It is exported as a log event named `action.<name>`, with the given
     * attributes and the usual session, user and page context.
     */
    addAction: (name: string, attributes?: Record<string, ActionAttributeValue>) => void;
};
export type ActionAttributeValue = string | number | boolean | string[] | number[] | boolean[];
