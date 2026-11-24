/** @typedef {import('@opentelemetry/api').Attributes} Attributes */
/**
 * @typedef {Object} Click
 * @property {object} target Clicks with the same target are grouped
 * @property {boolean} canBeDead Whether no reaction is a dead click
 * @property {boolean} selectsText Text selection is not frustration
 * @property {Attributes} attributes
 */
/**
 * @typedef {Object} ClickChain
 * @property {object} target
 * @property {number} timestamp of the first click
 * @property {number} count
 * @property {number[]} recent times of the last clicks, bounded
 * @property {boolean} rage
 * @property {string | undefined} href
 * @property {boolean} canBeDead
 * @property {boolean} selectsText
 * @property {boolean} active
 * @property {Attributes | undefined} error
 * @property {Set<object>} requests started during the chain, still pending
 * @property {Attributes} attributes
 * @property {ReturnType<typeof setTimeout>} [timer]
 */
/**
 * @callback EmitFn
 * @param {string} eventName
 * @param {Attributes} attributes
 * @param {number} timestamp
 */
/**
 * A chain ends when its target gets no click for this long. It is also how
 * long the page has to react to a click and how long an error is attributed
 * to it, or to the end of a request it started.
 */
export const CLICK_CHAIN_WINDOW_MS: 1000;
export const RAGE_CLICK_MIN_COUNT: 3;
/** Errors after this, since the first click, are never attributed to it */
export const MAX_ERROR_WINDOW_MS: 10000;
/**
 * Groups clicks on the same target and classifies each group when it ends.
 * DOM agnostic so the rules can be unit tested.
 */
export class ClickChainDetector {
    /**
     * @param {EmitFn} emit
     * @param {{watch?: () => void, unwatch?: () => void}} [hooks] Called when
     *  a click starts and stops waiting for a reaction, to only observe the
     *  page while one does.
     */
    constructor(emit: EmitFn, hooks?: {
        watch?: () => void;
        unwatch?: () => void;
    });
    _emit: EmitFn;
    _hooks: {
        watch?: () => void;
        unwatch?: () => void;
    };
    _watching: boolean;
    /** @type {ClickChain[]} */
    _chains: ClickChain[];
    /**
     * Ended chains whose requests are still pending: an error when they
     * respond is still an error click.
     * @type {ClickChain[]}
     */
    _waiting: ClickChain[];
    /** @param {Click} click */
    click(click: Click): void;
    /** The page reacted: DOM change, request, scroll... */
    activity(): void;
    _updateWatching(): void;
    /** @param {object} request */
    requestStarted(request: object): void;
    /** @param {object} request */
    requestEnded(request: object): void;
    /** @param {Attributes} attributes of the error */
    error(attributes: Attributes): void;
    /**
     * Ends all chains now, when the page is being hidden or left. A page that
     * goes away did react, so no dead clicks are reported.
     */
    flush(): void;
    /**
     * @param {ClickChain} chain
     * @param {boolean} leaving
     */
    _end(chain: ClickChain, leaving: boolean): void;
    /**
     * @param {ClickChain} chain
     * @param {number} ms capped by the max error window
     */
    _wait(chain: ClickChain, ms: number): void;
    /** @param {ClickChain} chain */
    _stopWaiting(chain: ClickChain): void;
    /** @param {ClickChain} chain */
    _emitError(chain: ClickChain): void;
}
export type Attributes = import("@opentelemetry/api").Attributes;
export type Click = {
    /**
     * Clicks with the same target are grouped
     */
    target: object;
    /**
     * Whether no reaction is a dead click
     */
    canBeDead: boolean;
    /**
     * Text selection is not frustration
     */
    selectsText: boolean;
    attributes: Attributes;
};
export type ClickChain = {
    target: object;
    /**
     * of the first click
     */
    timestamp: number;
    count: number;
    /**
     * times of the last clicks, bounded
     */
    recent: number[];
    rage: boolean;
    href: string | undefined;
    canBeDead: boolean;
    selectsText: boolean;
    active: boolean;
    error: Attributes | undefined;
    /**
     * started during the chain, still pending
     */
    requests: Set<object>;
    attributes: Attributes;
    timer?: number | undefined;
};
export type EmitFn = (eventName: string, attributes: Attributes, timestamp: number) => any;
