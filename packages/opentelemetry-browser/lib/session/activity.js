/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag} from '@opentelemetry/api';

/** @typedef {import('./config.js').SessionConfig} SessionConfig */

/** @type {readonly string[]} */
export const DEFAULT_ACTIVITY_EVENTS = Object.freeze([
    'pointerdown',
    'keydown',
    'scroll',
    'wheel',
]);

// Browsers only expose `on<event>` for touch events when touch is
// supported, so UI events can't be told apart from typos by that alone.
const KNOWN_EVENTS = new Set([
    'click',
    'dblclick',
    'auxclick',
    'contextmenu',
    'mousedown',
    'mouseup',
    'mousemove',
    'pointerdown',
    'pointerup',
    'pointermove',
    'keydown',
    'keyup',
    'keypress',
    'scroll',
    'wheel',
    'touchstart',
    'touchmove',
    'touchend',
    'touchcancel',
    'input',
    'beforeinput',
    'change',
    'submit',
    'focusin',
    'focusout',
    'select',
    'copy',
    'cut',
    'paste',
    'dragstart',
    'drop',
    'resize',
    'visibilitychange',
]);

/**
 * Invalid values fall back to defaults so a typo never leaves sessions
 * without any activity signal.
 * @param {SessionConfig | null | undefined} config
 * @returns {string[]}
 */
export function resolveActivityEvents(config) {
    const events = config?.activityEvents;
    if (events === undefined) {
        return [...DEFAULT_ACTIVITY_EVENTS];
    }
    if (
        !Array.isArray(events) ||
        events.length === 0 ||
        !events.every((e) => typeof e === 'string' && e.length > 0)
    ) {
        diag.warn(
            `Invalid "session.activityEvents" value. Using ${DEFAULT_ACTIVITY_EVENTS.join(', ')}.`
        );
        return [...DEFAULT_ACTIVITY_EVENTS];
    }
    // Custom events are valid, so unknown names are kept and only reported
    for (const name of events) {
        if (!isKnownEvent(name)) {
            diag.warn(
                `Unknown event "${name}" in "session.activityEvents". Event names are case sensitive, check for typos.`
            );
        }
    }
    return [...events];
}

/**
 * Listens in the capture phase so handlers calling `stopPropagation()`
 * can't hide activity. Untrusted events are ignored so scripts dispatching
 * synthetic events can't keep a session alive.
 * @param {{recordActivity: (opts?: {renew?: boolean}) => void}} manager
 * @param {readonly string[]} events
 * @param {(event: Event) => boolean} [isTrusted]
 * @returns {() => void} stop tracking
 */
export function trackUserActivity(
    manager,
    events,
    isTrusted = (event) => event.isTrusted
) {
    const win = globalThis.window;
    if (!win) {
        return () => {};
    }
    const doc = globalThis.document;
    const onActivity = (/** @type {Event} */ event) => {
        if (isTrusted(event)) {
            manager.recordActivity();
        }
    };
    // Someone looking at the tab is presence, not intent: it can extend a
    // session but not start one.
    const onVisibility = () => {
        if (doc.visibilityState === 'visible') {
            manager.recordActivity({renew: false});
        }
    };
    const options = {capture: true, passive: true};
    for (const event of events) {
        win.addEventListener(event, onActivity, options);
    }
    doc?.addEventListener('visibilitychange', onVisibility, options);
    return () => {
        for (const event of events) {
            win.removeEventListener(event, onActivity, options);
        }
        doc?.removeEventListener('visibilitychange', onVisibility, options);
    };
}

/** @param {string} name */
function isKnownEvent(name) {
    return (
        KNOWN_EVENTS.has(name) ||
        (typeof window !== 'undefined' && `on${name}` in window)
    );
}
