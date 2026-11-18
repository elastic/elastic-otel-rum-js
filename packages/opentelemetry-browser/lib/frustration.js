/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag, SpanKind} from '@opentelemetry/api';

import {
    ATTR_BROWSER_CSS_SELECTOR,
    ATTR_BROWSER_PAGE_X,
    ATTR_BROWSER_PAGE_Y,
    ATTR_BROWSER_TAG_NAME,
    ATTR_EXCEPTION_MESSAGE,
    ATTR_EXCEPTION_TYPE,
    ATTR_FRUSTRATION_CLICK_COUNT,
    ATTR_URL_FULL,
    EVENT_FRUSTRATION_DEAD_CLICK,
    EVENT_FRUSTRATION_ERROR_CLICK,
    EVENT_FRUSTRATION_RAGE_CLICK,
} from './semconv.js';

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
 * to it.
 */
export const CLICK_CHAIN_WINDOW_MS = 1000;
export const RAGE_CLICK_MIN_COUNT = 3;

// Their reaction (typing, a toggle, focus, native UI) doesn't change the DOM,
// and repeated clicks on them are normal (placing the caret, selecting text).
const IGNORED_SELECTOR = [
    'input:not([type="button"], [type="submit"], [type="reset"], [type="image"])',
    'textarea',
    'select',
    'option',
    'label',
    '[contenteditable]:not([contenteditable="false"])',
    'canvas',
    'video',
    'audio',
].join(',');

const INTERACTIVE_SELECTOR = [
    'a[href]',
    'button',
    'input',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[role="menuitem"]',
    '[role="tab"]',
    '[onclick]',
].join(',');

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
    constructor(emit, hooks = {}) {
        this._emit = emit;
        this._hooks = hooks;
        /** @type {ClickChain[]} */
        this._chains = [];
    }

    /** @param {Click} click */
    click(click) {
        const now = Date.now();
        let chain = this._chains.find((c) => c.target === click.target);
        if (chain) {
            const {recent} = chain;
            chain.count++;
            recent.push(now);
            if (recent.length > RAGE_CLICK_MIN_COUNT) {
                recent.shift();
            }
            chain.rage ||=
                recent.length === RAGE_CLICK_MIN_COUNT &&
                now - recent[0] <= CLICK_CHAIN_WINDOW_MS;
            chain.selectsText ||= click.selectsText;
            clearTimeout(chain.timer);
        } else {
            chain = {
                ...click,
                timestamp: now,
                count: 1,
                recent: [now],
                rage: false,
                href: globalThis.location?.href,
                active: false,
                error: undefined,
            };
            this._chains.push(chain);
            if (this._chains.length === 1) {
                this._hooks.onBusy?.();
            }
        }
        const current = chain;
        chain.timer = setTimeout(
            () => this._end(current, false),
            CLICK_CHAIN_WINDOW_MS
        );
    }

    /** The page reacted: DOM change, request, scroll... */
    activity() {
        for (const chain of this._chains) {
            chain.active = true;
        }
    }

    /** @param {Attributes} attributes of the error */
    error(attributes) {
        for (const chain of this._chains) {
            chain.error ??= attributes;
        }
    }

    /**
     * Ends all chains now, when the page is being hidden or left. A page that
     * goes away did react, so no dead clicks are reported.
     */
    flush() {
        for (const chain of [...this._chains]) {
            clearTimeout(chain.timer);
            this._end(chain, true);
        }
    }

    /**
     * @param {ClickChain} chain
     * @param {boolean} leaving
     */
    _end(chain, leaving) {
        this._chains.splice(this._chains.indexOf(chain), 1);
        if (this._chains.length === 0) {
            this._hooks.onIdle?.();
        }

        const {attributes, timestamp} = chain;
        if (chain.rage && !chain.selectsText) {
            this._emit(
                EVENT_FRUSTRATION_RAGE_CLICK,
                {...attributes, [ATTR_FRUSTRATION_CLICK_COUNT]: chain.count},
                timestamp
            );
        }
        const navigated = globalThis.location?.href !== chain.href;
        if (
            chain.canBeDead &&
            !chain.active &&
            !chain.selectsText &&
            !leaving &&
            !navigated
        ) {
            this._emit(EVENT_FRUSTRATION_DEAD_CLICK, attributes, timestamp);
        }
        if (chain.error) {
            this._emit(
                EVENT_FRUSTRATION_ERROR_CLICK,
                {...attributes, ...chain.error},
                timestamp
            );
        }
    }
}

/**
 * Tells the detector about requests as they start, through the spans of the
 * fetch and XHR instrumentations, so a slow response is not a dead click.
 */
export class ClientSpanActivityProcessor {
    /** @param {() => void} onActivity */
    constructor(onActivity) {
        this._onActivity = onActivity;
    }
    /** @param {{kind?: SpanKind}} span */
    onStart(span) {
        if (span.kind === SpanKind.CLIENT) {
            this._onActivity();
        }
    }
    onEnd() {}
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
    }
}

/**
 * @param {boolean | FrustrationConfig | undefined} config
 * @returns {FrustrationConfig | undefined} undefined when disabled
 */
export function resolveFrustrationConfig(config) {
    if (config === false) {
        return undefined;
    }
    if (config === undefined || config === true) {
        return {};
    }
    const selectors = config?.ignoreSelectors;
    if (selectors === undefined && typeof config === 'object' && config) {
        return {};
    }
    if (
        Array.isArray(selectors) &&
        selectors.every((s) => typeof s === 'string' && s.length > 0)
    ) {
        return {ignoreSelectors: [...selectors]};
    }
    diag.warn(
        `Invalid "frustration" configuration. Frustration signals are reported without ignored selectors.`
    );
    return {};
}

/**
 * Reports rage, dead and error clicks as log events.
 * @param {import('@opentelemetry/api-logs').Logger} logger
 * @param {FrustrationConfig} config
 * @returns {{recordActivity: () => void, stop: () => void}}
 */
export function startFrustrationDetection(logger, config) {
    const win = globalThis.window;
    const doc = globalThis.document;
    if (!win || !doc) {
        return {recordActivity() {}, stop() {}};
    }

    const ignoredSelector = [
        IGNORED_SELECTOR,
        ...(config.ignoreSelectors ?? []).filter((s) => {
            if (isValidSelector(s)) {
                return true;
            }
            diag.warn(
                `Invalid selector "${s}" in "frustration.ignoreSelectors"`
            );
            return false;
        }),
    ].join(',');

    /** @type {EmitFn} */
    const emit = (eventName, attributes, timestamp) => {
        // Best effort: frustration signals must not break the app
        try {
            // Respects the session sampling decision
            if (logger.enabled?.() === false) {
                return;
            }
            logger.emit({eventName, attributes, timestamp});
        } catch (err) {
            diag.warn(`Failed to report ${eventName}: ${err}`);
        }
    };

    const mutations = new MutationObserver(() => detector.activity());
    const detector = new ClickChainDetector(emit, {
        onBusy() {
            mutations.observe(doc, {
                subtree: true,
                childList: true,
                attributes: true,
                characterData: true,
            });
        },
        onIdle() {
            mutations.disconnect();
        },
    });

    const onClick = (/** @type {MouseEvent} */ event) => {
        const el = event.target;
        // Untrusted clicks come from scripts, not from users
        if (!event.isTrusted || !(el instanceof Element)) {
            return;
        }
        try {
            if (el.closest(ignoredSelector)) {
                return;
            }
            // Clicks on an icon inside a button are clicks on the button
            const target = el.closest(INTERACTIVE_SELECTOR) ?? el;
            detector.click({
                target,
                canBeDead: canBeDead(target, event),
                selectsText: !(win.getSelection()?.isCollapsed ?? true),
                attributes: {
                    [ATTR_BROWSER_CSS_SELECTOR]: cssSelector(target),
                    [ATTR_BROWSER_TAG_NAME]: target.tagName,
                    [ATTR_BROWSER_PAGE_X]: event.pageX,
                    [ATTR_BROWSER_PAGE_Y]: event.pageY,
                    [ATTR_URL_FULL]: win.location.href,
                },
            });
        } catch (err) {
            diag.warn(`Frustration detection failed: ${err}`);
        }
    };
    const onActivity = () => detector.activity();
    const onError = (/** @type {ErrorEvent | PromiseRejectionEvent} */ e) => {
        const error = 'reason' in e ? e.reason : (e.error ?? e.message);
        if (error != null) {
            detector.error(errorAttributes(error));
        }
    };
    const onHide = (/** @type {Event} */ e) => {
        if (e.type === 'pagehide' || doc.visibilityState === 'hidden') {
            detector.flush();
        }
    };

    const passive = {capture: true, passive: true};
    // Capture on window runs before the log processor flushes on document,
    // so events of the chains ended here are still exported.
    const hideOptions = {capture: true};
    doc.addEventListener('click', onClick, passive);
    win.addEventListener('scroll', onActivity, passive);
    // A popup or new window took the focus
    win.addEventListener('blur', onActivity);
    win.addEventListener('error', onError);
    win.addEventListener('unhandledrejection', onError);
    win.addEventListener('visibilitychange', onHide, hideOptions);
    win.addEventListener('pagehide', onHide, hideOptions);

    return {
        recordActivity: onActivity,
        stop() {
            doc.removeEventListener('click', onClick, passive);
            win.removeEventListener('scroll', onActivity, passive);
            win.removeEventListener('blur', onActivity);
            win.removeEventListener('error', onError);
            win.removeEventListener('unhandledrejection', onError);
            win.removeEventListener('visibilitychange', onHide, hideOptions);
            win.removeEventListener('pagehide', onHide, hideOptions);
            detector.flush();
            mutations.disconnect();
        },
    };
}

/**
 * Only elements that look clickable are expected to react. Clicks that may
 * act outside the page, such as opening a new tab, are not dead.
 * @param {Element} target
 * @param {MouseEvent} event
 */
function canBeDead(target, event) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return false;
    }
    const link = target.closest('a[href]');
    if (
        link &&
        (link.hasAttribute('download') ||
            !['', '_self'].includes(link.getAttribute('target') ?? ''))
    ) {
        return false;
    }
    return (
        target.matches(INTERACTIVE_SELECTOR) ||
        getComputedStyle(target).cursor === 'pointer'
    );
}

/**
 * @param {unknown} error
 * @returns {Attributes}
 */
function errorAttributes(error) {
    if (error instanceof Error) {
        return {
            [ATTR_EXCEPTION_TYPE]: error.name,
            [ATTR_EXCEPTION_MESSAGE]: error.message,
        };
    }
    return {[ATTR_EXCEPTION_MESSAGE]: String(error)};
}

/** @param {string} selector */
function isValidSelector(selector) {
    try {
        document.createDocumentFragment().querySelector(selector);
        return true;
    } catch {
        return false;
    }
}

/**
 * Same format as `browser.css_selector` of the `user-action` instrumentation,
 * so frustration events can be matched with clicks.
 * @param {Element} element
 * @returns {string}
 */
export function cssSelector(element) {
    /** @type {string[]} */
    const parts = [];
    /** @type {Element | null} */
    let el = element;
    while (el) {
        const id = el.getAttribute('id');
        if (
            id &&
            el.ownerDocument.querySelectorAll(`#${CSS.escape(id)}`).length === 1
        ) {
            parts.unshift(`#${CSS.escape(id)}`);
            break;
        }
        const classes = classSelector(el);
        /** @type {Element | null} */
        const parent = el.parentElement;
        const siblings = parent
            ? Array.from(parent.children).filter(
                  (s) => classSelector(s) === classes
              )
            : [];
        parts.unshift(
            siblings.length > 1
                ? `${classes}:nth-child(${siblings.indexOf(el) + 1})`
                : classes
        );
        el = parent;
    }
    return parts.join(' > ');
}

/** @param {Element} el */
function classSelector(el) {
    return (
        el.localName +
        Array.from(el.classList, (c) => `.${CSS.escape(c)}`).join('')
    );
}
