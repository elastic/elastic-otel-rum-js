/**
 * Public API returned by `startBrowserSdk`. Without a logger (SDK disabled or
 * failed to start) `addAction` is a no-op.
 * @param {import('@opentelemetry/api-logs').Logger | undefined} logger
 * @param {() => string | undefined} [getHref] returns the current page URL
 * @returns {ActionApi}
 */
export function createActionApi(logger: import("@opentelemetry/api-logs").Logger | undefined, getHref?: () => string | undefined): ActionApi;
/**
 * @typedef {Object} ActionApi
 * @property {(
 *  name: string,
 *  attributes?: Record<string, string | number | boolean>
 * ) => void} addAction Records an app-defined event, such as a search or an
 *  add-to-cart. It is exported as a log event named `name`, with the given
 *  attributes and the usual session, user and page context.
 */
/** Longer names are rejected */
export const MAX_ACTION_NAME_LENGTH: 128;
/** Attributes beyond this count are ignored */
export const MAX_ACTION_ATTRIBUTES: 20;
/** Longer string values are truncated */
export const MAX_ACTION_VALUE_LENGTH: 1024;
export type ActionApi = {
    /**
     * Records an app-defined event, such as a search or an
     * add-to-cart. It is exported as a log event named `name`, with the given
     * attributes and the usual session, user and page context.
     */
    addAction: (name: string, attributes?: Record<string, string | number | boolean>) => void;
};
