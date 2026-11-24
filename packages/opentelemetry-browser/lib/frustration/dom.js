/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

import {
    ATTR_BROWSER_CSS_SELECTOR,
    ATTR_BROWSER_PAGE_X,
    ATTR_BROWSER_PAGE_Y,
    ATTR_BROWSER_TAG_NAME,
    ATTR_EXCEPTION_MESSAGE,
    ATTR_EXCEPTION_TYPE,
    ATTR_URL_FULL,
} from '../semconv.js';
import {ClickChainDetector} from './detector.js';
import {cssSelector} from './selector.js';

/** @typedef {import('./config.js').FrustrationConfig} FrustrationConfig */
/** @typedef {import('./detector.js').Attributes} Attributes */
/** @typedef {import('./detector.js').EmitFn} EmitFn */

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
 * Reports rage, dead and error clicks as log events.
 * @param {import('@opentelemetry/api-logs').Logger} logger
 * @param {FrustrationConfig} config
 * @returns {{
 *  requestStarted: (request: object) => void,
 *  requestEnded: (request: object) => void,
 *  stop: () => void,
 * }}
 */
export function startFrustrationDetection(logger, config) {
    const win = globalThis.window;
    const doc = globalThis.document;
    if (!win || !doc) {
        return {requestStarted() {}, requestEnded() {}, stop() {}};
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
        watch() {
            mutations.observe(doc, {
                subtree: true,
                childList: true,
                attributes: true,
                characterData: true,
            });
        },
        unwatch() {
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
            // Nothing would be exported for a sampled-out session
            if (logger.enabled?.() === false || el.closest(ignoredSelector)) {
                return;
            }
            // Clicks on an icon inside a button are clicks on the button
            const target = el.closest(INTERACTIVE_SELECTOR) ?? el;
            detector.click({
                target,
                // Changes inside shadow roots can't be observed. Custom
                // elements may have a closed one.
                canBeDead:
                    event.composedPath()[0] === el &&
                    !el.localName.includes('-') &&
                    canBeDead(target, event),
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
        // Throwing here would report an error of our own
        try {
            const error = 'reason' in e ? e.reason : (e.error ?? e.message);
            if (error != null) {
                detector.error(errorAttributes(error));
            }
        } catch (err) {
            diag.warn(`Frustration detection failed: ${err}`);
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
        requestStarted: (request) => detector.requestStarted(request),
        requestEnded: (request) => detector.requestEnded(request),
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
    let message;
    try {
        message = String(error);
    } catch {
        // Such as objects without prototype
        message = Object.prototype.toString.call(error);
    }
    return {[ATTR_EXCEPTION_MESSAGE]: message};
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
