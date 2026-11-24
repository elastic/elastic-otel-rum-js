/**
 * @typedef {Object} FrustrationConfig
 * @property {string[]} [ignoreSelectors] Clicks on elements matching these
 *  CSS selectors, or inside them, are not reported.
 */
/**
 * @param {boolean | FrustrationConfig | undefined} config
 * @returns {FrustrationConfig | undefined} undefined when disabled
 */
export function resolveFrustrationConfig(config: boolean | FrustrationConfig | undefined): FrustrationConfig | undefined;
export type FrustrationConfig = {
    /**
     * Clicks on elements matching these
     * CSS selectors, or inside them, are not reported.
     */
    ignoreSelectors?: string[] | undefined;
};
