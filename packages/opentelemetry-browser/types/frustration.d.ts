/**
 * @param {boolean | FrustrationConfig | undefined} config
 * @returns {FrustrationConfig | undefined} undefined when disabled
 */
export function resolveFrustrationConfig(config: boolean | FrustrationConfig | undefined): FrustrationConfig | undefined;
/**
 * Reports rage, dead and error clicks as log events.
 * @param {import('@opentelemetry/api-logs').Logger} logger
 * @param {FrustrationConfig} config
 * @returns {{
 *  requestStarted: (request: object) => void,
 *  requestEnded: (request: object) => void,
 *  stop: () => void,
 * }}
 */
export function startFrustrationDetection(logger: import("@opentelemetry/api-logs").Logger, config: FrustrationConfig): {
    requestStarted: (request: object) => void;
    requestEnded: (request: object) => void;
    stop: () => void;
};
/**
 * Same format as `browser.css_selector` of the `user-action` instrumentation,
 * so frustration events can be matched with clicks.
 * @param {Element} element
 * @returns {string}
 */
export function cssSelector(element: Element): string;
/**
 * @typedef {Object} FrustrationConfig
 * @property {string[]} [ignoreSelectors] Clicks on elements matching these
 *  CSS selectors, or inside them, are not reported.
 */
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
     * @param {{onBusy?: () => void, onIdle?: () => void}} [hooks] Called when
     *  the first chain starts and the last one ends, to only observe the page
     *  while a click waits for a reaction.
     */
    constructor(emit: EmitFn, hooks?: {
        onBusy?: () => void;
        onIdle?: () => void;
    });
    _emit: EmitFn;
    _hooks: {
        onBusy?: () => void;
        onIdle?: () => void;
    };
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
/**
 * Tells the detector about requests through the spans of the fetch and XHR
 * instrumentations: a request start is a reaction, so a slow response is not
 * a dead click, and an error once it responds is an error click.
 */
export class RequestSpanProcessor {
    /**
     * @param {{
     *  requestStarted: (span: object) => void,
     *  requestEnded: (span: object) => void,
     * }} listener
     */
    constructor(listener: {
        requestStarted: (span: object) => void;
        requestEnded: (span: object) => void;
    });
    _listener: {
        requestStarted: (span: object) => void;
        requestEnded: (span: object) => void;
    };
    /** @param {{kind?: SpanKind}} span */
    onStart(span: {
        kind?: SpanKind;
    }): void;
    /** @param {{kind?: SpanKind}} span */
    onEnd(span: {
        kind?: SpanKind;
    }): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
export type FrustrationConfig = {
    /**
     * Clicks on elements matching these
     * CSS selectors, or inside them, are not reported.
     */
    ignoreSelectors?: string[] | undefined;
};
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
import { SpanKind } from '@opentelemetry/api';
